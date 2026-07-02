import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminNotification } from '@/lib/adminProviderSync';
import { getCancellationFeeForBooking } from '@/lib/cancellationFee';
import {
  applyRescheduleFeeFields,
  detectRescheduleChange,
  type BusinessRescheduleSettings,
} from '@/lib/rescheduleFee';
import { syncBookingCancelled, syncBookingUpdated } from '@/lib/googleCalendar';
import { formatFrequencyRepeatsForDisplay } from '@/lib/industryFrequencyRepeats';
import { extractPricingSummaryFromCustomization } from '@/lib/customerBookingPricingDisplay';
import { ensureCustomerRowForBusiness } from '@/lib/ensureCustomerRowForBusiness';
import { restoreGiftCardRedemptionForBooking } from '@/lib/giftCardLifecycle';
import type { CancellationSettingsPayload } from '@/app/api/admin/cancellation-settings/route';
import { requiresAdminCancellationConfirm } from '@/lib/cancellationRequest';
import { assertCustomerCanCancelBooking } from '@/lib/customerSelfCancel';
import { logBookingUpdated, resolveCustomerDisplayName } from '@/lib/bookingActivityLogs';
import { formatQuoteLogActorName, getRequestClientIp } from '@/lib/draftQuoteLogs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getServiceCategoryCancellationFee(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  serviceId: string,
): Promise<Record<string, unknown> | null> {
  const base = await supabase
    .from('industry_service_category')
    .select('cancellation_fee')
    .eq('id', serviceId)
    .eq('business_id', businessId)
    .maybeSingle();
  const baseFee = (base.data as { cancellation_fee?: Record<string, unknown> } | null)?.cancellation_fee;
  if (baseFee) return baseFee;

  const form2 = await supabase
    .from('industry_form2_service_categories')
    .select('cancellation_fee')
    .eq('id', serviceId)
    .eq('business_id', businessId)
    .maybeSingle();
  return (form2.data as { cancellation_fee?: Record<string, unknown> } | null)?.cancellation_fee ?? null;
}

/** Normalize display time (e.g. "6:00 PM") to DB time ("18:00:00"). */
function normalizeTimeForDb(timeStr: string): string | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  const amPm = trimmed.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (amPm) {
    let h = parseInt(amPm[1], 10);
    const m = amPm[2] || '00';
    const s = amPm[3] || '00';
    if (amPm[4].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (amPm[4].toUpperCase() === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}:${s}`;
  }
  const already24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (already24) {
    const h = already24[1].padStart(2, '0');
    const m = already24[2] || '00';
    const s = (already24[3] || '00').padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
  return trimmed || null;
}

function formatTimeForDisplay(timeStr: string): string {
  if (!timeStr || typeof timeStr !== 'string') return timeStr;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return trimmed;
  const hours = parseInt(match[1], 10);
  const minutes = match[2] || '00';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${minutes} ${ampm}`;
}

function dbToCustomerBooking(row: any, extras?: { frequencyRepeats?: string | null }): Record<string, unknown> {
  const statusMap: Record<string, string> = {
    pending: 'scheduled',
    confirmed: 'confirmed',
    in_progress: 'in_progress',
    completed: 'completed',
    cancelled: 'canceled',
  };
  const date = row.date ?? row.scheduled_date ?? '';
  const rawTime = row.time ?? row.scheduled_time ?? '';
  const time = formatTimeForDisplay(String(rawTime));
  const totalPrice = Number(row.total_price);
  const amount = Number(row.amount);
  const price = (totalPrice && !Number.isNaN(totalPrice)) ? totalPrice : ((amount && !Number.isNaN(amount)) ? amount : 0);
  const providerRow = row.service_providers ?? row.providers;
  let providerName = providerRow
    ? [providerRow.first_name, providerRow.last_name].filter(Boolean).join(' ').trim()
    : (row.provider_name ?? row.assigned_provider ?? '').trim();
  const repeatsDisp = formatFrequencyRepeatsForDisplay(extras?.frequencyRepeats ?? null);
  const pricingSummary = extractPricingSummaryFromCustomization(row.customization);
  return {
    id: row.id,
    service: row.service ?? '',
    serviceId: row.service_id ?? undefined,
    provider: providerName || 'Unassigned',
    frequency: row.frequency && String(row.frequency).trim() ? String(row.frequency).trim() : '',
    date,
    time,
    status: statusMap[row.status] ?? (row.status ?? 'scheduled'),
    address: row.address ?? '',
    ...(row.zip_code != null && String(row.zip_code).trim()
      ? { zipCode: String(row.zip_code).trim() }
      : {}),
    contact: row.customer_phone ?? row.customer_email ?? '',
    notes: row.notes ?? '',
    price,
    tipAmount: row.tip_amount != null ? Number(row.tip_amount) : undefined,
    tipUpdatedAt: row.tip_updated_at ?? undefined,
    customization: row.customization != null && typeof row.customization === 'object' ? row.customization : undefined,
    cancellationFeeAmount: row.cancellation_fee_amount != null ? Number(row.cancellation_fee_amount) : undefined,
    cancellationFeeCurrency: row.cancellation_fee_currency ?? undefined,
    rescheduleFeeAmount: row.reschedule_fee_amount != null ? Number(row.reschedule_fee_amount) : undefined,
    rescheduleFeeCurrency: row.reschedule_fee_currency ?? undefined,
    ...(repeatsDisp ? { frequencyRepeatsDisplay: repeatsDisp } : {}),
    ...(row.duration_minutes != null && Number(row.duration_minutes) > 0
      ? { durationMinutes: Number(row.duration_minutes) }
      : {}),
    ...(pricingSummary ? { pricingSummary } : {}),
  };
}

/** GET - Fetch a single booking for the logged-in customer (e.g. for rebook prefill) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const businessId = request.nextUrl.searchParams.get('business');
  if (!businessId) {
    return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: bookingId } = await params;
  if (!bookingId) {
    return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
  }

  const ensured = await ensureCustomerRowForBusiness(supabase, user, businessId);
  if (!ensured.ok) {
    return NextResponse.json({ error: ensured.error }, { status: ensured.status });
  }
  const customer = ensured.customer;

  const { data: row, error } = await supabase
    .from('bookings')
    .select(`
      id, business_id, customer_id, provider_id, service_id, service, status,
      scheduled_date, scheduled_time, date, time, address, apt_no, zip_code,
      notes, total_price, amount, payment_method, payment_status, tip_amount, tip_updated_at,
      customer_name, customer_email, customer_phone, customization, frequency, provider_name,
      cancellation_fee_amount, cancellation_fee_currency,
      reschedule_fee_amount, reschedule_fee_currency,
      recurring_series_id,
      service_providers ( first_name, last_name )
    `)
    .eq('id', bookingId)
    .eq('customer_id', customer.id)
    .eq('business_id', businessId)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // If join didn't return provider but provider_id is set, fetch name from service_providers
  let rowForMapping = row;
  const needsProviderName = row.provider_id && !(row.service_providers ?? row.providers) && !(row.provider_name ?? row.assigned_provider ?? '').trim();
  if (needsProviderName) {
    const { data: prov } = await supabase
      .from('service_providers')
      .select('first_name, last_name')
      .eq('id', row.provider_id)
      .single();
    if (prov) {
      const name = [prov.first_name, prov.last_name].filter(Boolean).join(' ').trim();
      if (name) rowForMapping = { ...row, provider_name: name };
    }
  }

  let frequencyRepeats: string | null = null;
  const seriesId = (rowForMapping as { recurring_series_id?: string }).recurring_series_id;
  if (seriesId) {
    const { data: seriesRow } = await supabase
      .from('recurring_series')
      .select('frequency_repeats')
      .eq('id', seriesId)
      .eq('business_id', businessId)
      .maybeSingle();
    const fr = (seriesRow as { frequency_repeats?: string } | null)?.frequency_repeats;
    if (fr != null && String(fr).trim()) frequencyRepeats = String(fr).trim();
  }

  return NextResponse.json({
    booking: dbToCustomerBooking(rowForMapping, { frequencyRepeats }),
  });
}

/** PATCH - Cancel (or update) a booking as the logged-in customer */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: bookingId } = await params;
  if (!bookingId) {
    return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
  }

  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select(
      'id, customer_id, business_id, scheduled_date, scheduled_time, date, time, service_id, google_calendar_event_id, recurring_series_id, completed_occurrence_dates, customer_cancelled_occurrence_dates, frequency, status, cancellation_request_status, pending_cancellation_occurrence_dates, customization, total_price, amount',
    )
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;

  const bizId = (booking as { business_id?: string }).business_id;
  if (!bizId) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const ensured = await ensureCustomerRowForBusiness(supabase, user, bizId, {
    customer_name: body.customer_name,
    customer_email: body.customer_email,
    customer_phone: body.customer_phone,
    address: body.address,
  });
  if (!ensured.ok) {
    return NextResponse.json({ error: ensured.error }, { status: ensured.status });
  }
  const customer = ensured.customer;

  if (booking.customer_id !== customer.id) {
    return NextResponse.json({ error: 'You can only update your own bookings' }, { status: 403 });
  }
  const rawStatusIn = body.status;
  let status: string | undefined;
  if (typeof rawStatusIn === 'string') {
    const s = rawStatusIn.trim().toLowerCase();
    if (s === 'canceled' || s === 'cancelled') status = 'cancelled';
    else if (s === 'complete' || s === 'completed') status = 'completed';
    else status = rawStatusIn.trim();
  } else if (rawStatusIn != null && rawStatusIn !== '') {
    status = String(rawStatusIn);
  }
  const occurrenceDateRaw = typeof body.occurrence_date === 'string' ? body.occurrence_date.slice(0, 10) : '';

  const isRecurring = !!(booking as { recurring_series_id?: string }).recurring_series_id;
  const perOccurrenceCancel =
    status === 'cancelled' && isRecurring && occurrenceDateRaw.length >= 8;
  const wantsComplete = status === 'completed';
  const perOccurrenceComplete = wantsComplete && isRecurring && occurrenceDateRaw.length >= 8;

  if (wantsComplete && isRecurring && occurrenceDateRaw.length < 8) {
    return NextResponse.json(
      {
        error:
          'For recurring bookings, include occurrence_date (YYYY-MM-DD) when marking a single visit completed.',
      },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (status && !perOccurrenceCancel && !perOccurrenceComplete) updates.status = status;

  // Allow customer to update only their details (Booking Koala-style: edit details + payment only when self-reschedule is off)
  if (typeof body.customer_name === 'string' && body.customer_name.trim()) updates.customer_name = body.customer_name.trim();
  if (typeof body.customer_email === 'string') updates.customer_email = String(body.customer_email).trim();
  if (typeof body.customer_phone === 'string') updates.customer_phone = String(body.customer_phone).trim();
  if (typeof body.address === 'string') updates.address = String(body.address).trim();
  if (typeof body.notes === 'string') updates.notes = String(body.notes).trim();
  if (typeof body.zip_code === 'string' && body.zip_code.trim()) {
    updates.zip_code = body.zip_code.trim();
  }

  let rescheduleFeeApplied: { amount: number; currency: string } | null = null;
  const isRescheduleRequest = body.reschedule === true;
  const rawScheduleDate = body.date ?? body.scheduled_date;
  const rawScheduleTime = body.time ?? body.scheduled_time;
  const hasScheduleInput =
    (typeof rawScheduleDate === 'string' && rawScheduleDate.trim().length >= 8) ||
    (typeof rawScheduleTime === 'string' && String(rawScheduleTime).trim().length > 0);

  if (isRescheduleRequest && hasScheduleInput && !status) {
    const { data: storeOpts } = await supabase
      .from('business_store_options')
      .select('allow_customer_self_reschedule')
      .eq('business_id', bizId)
      .maybeSingle();

    if (!storeOpts?.allow_customer_self_reschedule) {
      return NextResponse.json(
        { error: 'Self-reschedule is not enabled for this business.' },
        { status: 403 },
      );
    }

    const newDate =
      typeof rawScheduleDate === 'string' && rawScheduleDate.trim().length >= 8
        ? rawScheduleDate.trim().slice(0, 10)
        : null;
    const newTime =
      typeof rawScheduleTime === 'string' && String(rawScheduleTime).trim()
        ? normalizeTimeForDb(String(rawScheduleTime))
        : null;

    if (newDate) {
      updates.scheduled_date = newDate;
      updates.date = newDate;
    }
    if (newTime) {
      updates.scheduled_time = newTime;
      updates.time = newTime;
    }

    const bookingAfter = {
      ...booking,
      scheduled_date: newDate ?? booking.scheduled_date,
      date: newDate ?? booking.date,
      scheduled_time: newTime ?? booking.scheduled_time,
      time: newTime ?? booking.time,
    };
    const change = detectRescheduleChange(booking, bookingAfter);

    if (change.dateChanged || change.timeChanged) {
      const { data: rescheduleSettingsRow } = await supabase
        .from('business_reschedule_settings')
        .select('settings')
        .eq('business_id', bizId)
        .maybeSingle();

      rescheduleFeeApplied = applyRescheduleFeeFields(
        updates,
        booking,
        change,
        (rescheduleSettingsRow?.settings as BusinessRescheduleSettings) || null,
      );
    }
  }

  // Recurring: cancel a single occurrence only (does not cancel the whole series)
  if (perOccurrenceCancel && booking.business_id) {
    const { data: cancelSettings } = await supabase
      .from('business_cancellation_settings')
      .select('settings')
      .eq('business_id', booking.business_id)
      .maybeSingle();
    const cancelPayload = (cancelSettings?.settings as CancellationSettingsPayload) || {};
    const cancelCheck = assertCustomerCanCancelBooking(cancelPayload, booking);
    if (!cancelCheck.ok) {
      return NextResponse.json({ error: cancelCheck.error }, { status: 403 });
    }

    const prevPending = Array.isArray(
      (booking as { pending_cancellation_occurrence_dates?: string[] }).pending_cancellation_occurrence_dates,
    )
      ? [...(booking as { pending_cancellation_occurrence_dates: string[] }).pending_cancellation_occurrence_dates]
      : [];
    const prevCancelled = Array.isArray(
      (booking as { customer_cancelled_occurrence_dates?: string[] }).customer_cancelled_occurrence_dates,
    )
      ? [...(booking as { customer_cancelled_occurrence_dates: string[] }).customer_cancelled_occurrence_dates]
      : [];
    if (prevCancelled.includes(occurrenceDateRaw) || prevPending.includes(occurrenceDateRaw)) {
      return NextResponse.json({
        success: true,
        cancellationPending: prevPending.includes(occurrenceDateRaw),
        message: prevPending.includes(occurrenceDateRaw)
          ? 'Cancellation request already pending admin approval.'
          : 'Occurrence already cancelled',
      });
    }

    const needsAdminConfirm = requiresAdminCancellationConfirm(cancelPayload, booking);
    if (needsAdminConfirm) {
      updates.pending_cancellation_occurrence_dates = [...prevPending, occurrenceDateRaw];
      updates.cancellation_request_status = 'pending';
      updates.cancellation_requested_at = new Date().toISOString();
      updates.updated_at = new Date().toISOString();
    } else {
      const bookingForFee = {
        ...booking,
        scheduled_date: occurrenceDateRaw,
        date: occurrenceDateRaw,
      };
      let categoryFee = null;
      if (booking.service_id) {
        categoryFee = await getServiceCategoryCancellationFee(
          supabase,
          booking.business_id,
          booking.service_id,
        );
      }
      const fee = getCancellationFeeForBooking(
        bookingForFee,
        (cancelSettings?.settings as Record<string, unknown>) || null,
        categoryFee,
      );
      if (fee) {
        updates.cancellation_fee_amount = fee.amount;
        updates.cancellation_fee_currency = fee.currency;
      }
      updates.customer_cancelled_occurrence_dates = [...prevCancelled, occurrenceDateRaw];
      updates.updated_at = new Date().toISOString();
    }
  }

  // Recurring: mark one visit completed without setting the whole row to completed
  if (perOccurrenceComplete) {
    const prevDone = Array.isArray(
      (booking as { completed_occurrence_dates?: string[] }).completed_occurrence_dates,
    )
      ? [...(booking as { completed_occurrence_dates: string[] }).completed_occurrence_dates]
      : [];
    if (!prevDone.includes(occurrenceDateRaw)) {
      updates.completed_occurrence_dates = [...prevDone, occurrenceDateRaw];
    }
    updates.updated_at = new Date().toISOString();
  }

  if (status === 'cancelled' && booking.business_id && !perOccurrenceCancel) {
    const { data: cancelSettings } = await supabase
      .from('business_cancellation_settings')
      .select('settings')
      .eq('business_id', booking.business_id)
      .maybeSingle();
    const cancelPayload = (cancelSettings?.settings as CancellationSettingsPayload) || {};
    const cancelCheck = assertCustomerCanCancelBooking(cancelPayload, booking);
    if (!cancelCheck.ok) {
      return NextResponse.json({ error: cancelCheck.error }, { status: 403 });
    }

    const needsAdminConfirm = requiresAdminCancellationConfirm(cancelPayload, booking);
    if (needsAdminConfirm) {
      delete updates.status;
      updates.cancellation_request_status = 'pending';
      updates.cancellation_requested_at = new Date().toISOString();
    } else {
      let categoryFee = null;
      if (booking.service_id) {
        categoryFee = await getServiceCategoryCancellationFee(
          supabase,
          booking.business_id,
          booking.service_id,
        );
      }
      const fee = getCancellationFeeForBooking(
        booking,
        (cancelSettings?.settings as Record<string, unknown>) || null,
        categoryFee
      );
      if (fee) {
        updates.cancellation_fee_amount = fee.amount;
        updates.cancellation_fee_currency = fee.currency;
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', bookingId)
    .select()
    .single();

  if (updateError) {
    console.error('Customer cancel booking error:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const customerName = resolveCustomerDisplayName(
    updated as { customer_name?: string | null },
    customer.name
  );
  const actorName = (customer.name || formatQuoteLogActorName(user)).trim() || 'Customer';
  await logBookingUpdated(supabase, {
    businessId: bizId,
    bookingId,
    customerName,
    actorName,
    actorUserId: user.id,
    source: isRescheduleRequest ? 'reschedule form' : 'customer portal',
    ipAddress: getRequestClientIp(request),
    bookingAfter: updated as Record<string, unknown>,
    bookingBefore: booking as Record<string, unknown>,
  });

  if (isRescheduleRequest && hasScheduleInput) {
    await syncBookingUpdated(bizId, updated as Record<string, unknown>).catch(() => {});
    const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
    await createAdminNotification(bizId, 'booking_updated', {
      title: 'Booking rescheduled',
      message: rescheduleFeeApplied
        ? rescheduleFeeApplied.feeType === '%'
          ? `Customer rescheduled ${bkRef}. Reschedule fee: ${rescheduleFeeApplied.configuredRate}% ($${rescheduleFeeApplied.amount.toFixed(2)}).`
          : `Customer rescheduled ${bkRef}. Reschedule fee: $${rescheduleFeeApplied.amount.toFixed(2)}.`
        : `Customer rescheduled ${bkRef}.`,
      link: '/admin/bookings',
    });
    return NextResponse.json({
      booking: dbToCustomerBooking(updated),
      rescheduled: true,
      rescheduleFeeApplied,
    });
  }

  if (status === 'cancelled' && booking.business_id) {
    const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
    const isPendingRequest =
      updates.cancellation_request_status === 'pending' ||
      (Array.isArray(updates.pending_cancellation_occurrence_dates) &&
        (updates.pending_cancellation_occurrence_dates as string[]).length > 0);

    if (isPendingRequest) {
      if (perOccurrenceCancel) {
        await createAdminNotification(booking.business_id, 'cancellation_request', {
          title: 'Cancellation request',
          message: `Customer requested to cancel occurrence ${occurrenceDateRaw} for ${bkRef}.`,
          link: '/admin/bookings?tab=cancelled&cancelView=requests',
        });
      } else {
        await createAdminNotification(booking.business_id, 'cancellation_request', {
          title: 'Cancellation request',
          message: `Customer requested to cancel ${bkRef}. Approval required.`,
          link: '/admin/bookings?tab=cancelled&cancelView=requests',
        });
      }
      return NextResponse.json({
        booking: updated,
        cancellationPending: true,
        message:
          'Your cancellation request has been submitted and is pending admin approval.',
      });
    }

    if (perOccurrenceCancel) {
      await createAdminNotification(booking.business_id, 'cancellation_request', {
        title: 'Recurring occurrence cancelled',
        message: `Customer cancelled one date (${occurrenceDateRaw}) for ${bkRef}.`,
        link: '/admin/bookings',
      });
    } else {
      await syncBookingCancelled(booking.business_id, booking).catch(() => {});
      const giftRestore = await restoreGiftCardRedemptionForBooking(
        supabase,
        booking.business_id,
        bookingId,
        'Customer cancelled booking — gift card balance restored',
      );
      if (!giftRestore.ok) {
        console.warn('[customer/bookings] gift card restore on cancel:', giftRestore.message);
      }
      await createAdminNotification(booking.business_id, 'cancellation_request', {
        title: 'Booking cancelled',
        message: `Customer cancelled ${bkRef}.`,
        link: '/admin/bookings?tab=cancelled&cancelView=cancelled',
      });
    }
  }

  return NextResponse.json({ booking: updated });
}
