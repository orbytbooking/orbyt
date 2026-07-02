import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assertUserHasAdminModuleAccess } from '@/lib/bookingApiAuth';
import { createAdminNotification } from '@/lib/adminProviderSync';
import { getCancellationFeeForBooking } from '@/lib/cancellationFee';
import { syncBookingCancelled } from '@/lib/googleCalendar';
import { restoreGiftCardRedemptionForBooking } from '@/lib/giftCardLifecycle';
import {
  isMissingCancellationColumnError,
  mergeCancellationMetaIntoCustomization,
  readCancellationMetaFromBooking,
} from '@/lib/bookingCancellationMeta';
import { isFullSeriesCancellationPending } from '@/lib/cancellationRequest';

async function getServiceCategoryCancellationFee(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  serviceId: string
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

async function getAdminBookingAuth(request: NextRequest, bookingId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 }) };
  }
  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 }) };
  }

  const businessId = request.headers.get('x-business-id');
  if (!businessId) {
    return { error: NextResponse.json({ error: 'Business context required' }, { status: 400 }) };
  }

  const access = await assertUserHasAdminModuleAccess(user.id, businessId, 'bookings');
  if (access === 'no_service_role') {
    return { error: NextResponse.json({ error: 'Server configuration error' }, { status: 500 }) };
  }
  if (access === 'denied') {
    return { error: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }) };
  }

  if (!bookingId || bookingId === 'undefined') {
    return { error: NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 }) };
  }

  return { supabase, businessId };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const auth = await getAdminBookingAuth(request, bookingId);
    if ('error' in auth && auth.error) return auth.error;
    const { supabase, businessId } = auth as {
      supabase: ReturnType<typeof createClient>;
      businessId: string;
    };

    const body = await request.json().catch(() => ({}));
    const action = body.action === 'reject' ? 'reject' : body.action === 'approve' ? 'approve' : null;
    if (!action) {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
    }
    const occurrenceDate =
      typeof body.occurrenceDate === 'string' ? body.occurrenceDate.slice(0, 10) : '';

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select(
        'id, status, business_id, scheduled_date, scheduled_time, date, time, service_id, exclude_cancellation_fee, frequency, recurring_series_id, customer_cancelled_occurrence_dates, pending_cancellation_occurrence_dates, cancellation_request_status, customization, google_calendar_event_id'
      )
      .eq('id', bookingId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const pendingDates = Array.isArray(booking.pending_cancellation_occurrence_dates)
      ? [...booking.pending_cancellation_occurrence_dates]
      : [];
    const fullPending = isFullSeriesCancellationPending(booking);
    const hasPendingOccurrence = pendingDates.length > 0;

    if (!fullPending && !hasPendingOccurrence) {
      return NextResponse.json({ error: 'No pending cancellation request for this booking' }, { status: 400 });
    }

    if (action === 'reject') {
      const updates: Record<string, unknown> = {
        cancellation_request_status: null,
        cancellation_requested_at: null,
        pending_cancellation_occurrence_dates: [],
        updated_at: new Date().toISOString(),
      };

      let { data: updated, error: updateErr } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', bookingId)
        .eq('business_id', businessId)
        .select('*')
        .single();

      if (updateErr && isMissingCancellationColumnError(updateErr.message)) {
        const cust = mergeCancellationMetaIntoCustomization(booking.customization, {
          reasonId: null,
          reasonLabel: null,
          comment: null,
        });
        delete (cust as Record<string, unknown>).cancellationRequest;
        ({ data: updated, error: updateErr } = await supabase
          .from('bookings')
          .update({ customization: cust, updated_at: new Date().toISOString() })
          .eq('id', bookingId)
          .eq('business_id', businessId)
          .select('*')
          .single());
      }

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
      await createAdminNotification(businessId, 'booking_modified', {
        title: 'Cancellation request rejected',
        message: `Cancellation request for ${bkRef} was rejected.`,
        link: '/admin/bookings?tab=cancelled&cancelView=requests',
      });

      return NextResponse.json({ success: true, booking: updated });
    }

    const { data: cancelSettings } = await supabase
      .from('business_cancellation_settings')
      .select('settings')
      .eq('business_id', businessId)
      .maybeSingle();

    let categoryFee = null;
    if (booking.service_id) {
      categoryFee = await getServiceCategoryCancellationFee(supabase, businessId, booking.service_id);
    }

    const cancelMeta = readCancellationMetaFromBooking(booking);
    const now = new Date().toISOString();

    if (fullPending && !occurrenceDate) {
      const updates: Record<string, unknown> = {
        status: 'cancelled',
        cancellation_request_status: 'approved',
        cancellation_requested_at: null,
        pending_cancellation_occurrence_dates: [],
        updated_at: now,
      };

      if (cancelMeta.reasonId || cancelMeta.reasonLabel) {
        updates.cancellation_reason_id = cancelMeta.reasonId;
        updates.cancellation_reason_label = cancelMeta.reasonLabel;
        updates.cancellation_comment = cancelMeta.comment;
      }

      if (booking.exclude_cancellation_fee) {
        updates.cancellation_fee_amount = null;
        updates.cancellation_fee_currency = null;
      } else {
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

      let { data: updated, error: updateErr } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', bookingId)
        .eq('business_id', businessId)
        .select('*')
        .single();

      if (updateErr && isMissingCancellationColumnError(updateErr.message)) {
        const { cancellation_reason_id, cancellation_reason_label, cancellation_comment, ...rest } = updates;
        const fallback: Record<string, unknown> = { ...rest };
        if (cancelMeta.reasonLabel || cancelMeta.comment) {
          fallback.customization = mergeCancellationMetaIntoCustomization(booking.customization, cancelMeta);
        }
        ({ data: updated, error: updateErr } = await supabase
          .from('bookings')
          .update(fallback)
          .eq('id', bookingId)
          .eq('business_id', businessId)
          .select('*')
          .single());
      }

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      await syncBookingCancelled(businessId, updated).catch(() => {});
      await restoreGiftCardRedemptionForBooking(supabase, businessId, bookingId).catch(() => {});

      const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
      await createAdminNotification(businessId, 'booking_modified', {
        title: 'Cancellation approved',
        message: `Cancellation request for ${bkRef} was approved.`,
        link: '/admin/bookings?tab=cancelled&cancelView=cancelled',
      });

      return NextResponse.json({ success: true, booking: updated });
    }

    const datesToApprove = occurrenceDate
      ? pendingDates.filter((d) => String(d).slice(0, 10) === occurrenceDate)
      : pendingDates;

    if (datesToApprove.length === 0) {
      return NextResponse.json({ error: 'No matching pending occurrence to approve' }, { status: 400 });
    }

    const prevCancelled = Array.isArray(booking.customer_cancelled_occurrence_dates)
      ? [...booking.customer_cancelled_occurrence_dates]
      : [];
    const nextCancelled = [...new Set([...prevCancelled, ...datesToApprove.map((d) => String(d).slice(0, 10))])];
    const nextPending = pendingDates.filter(
      (d) => !datesToApprove.some((x) => String(x).slice(0, 10) === String(d).slice(0, 10))
    );

    const updates: Record<string, unknown> = {
      customer_cancelled_occurrence_dates: nextCancelled,
      pending_cancellation_occurrence_dates: nextPending,
      cancellation_request_status: nextPending.length > 0 || fullPending ? 'pending' : 'approved',
      updated_at: now,
    };

    if (!fullPending && nextPending.length === 0) {
      updates.cancellation_requested_at = null;
    }

    const feeDate = datesToApprove[0];
    if (!booking.exclude_cancellation_fee && feeDate) {
      const fee = getCancellationFeeForBooking(
        { ...booking, scheduled_date: feeDate, date: feeDate },
        (cancelSettings?.settings as Record<string, unknown>) || null,
        categoryFee
      );
      if (fee) {
        updates.cancellation_fee_amount = fee.amount;
        updates.cancellation_fee_currency = fee.currency;
      }
    }

    const { data: updated, error: updateErr } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .eq('business_id', businessId)
      .select('*')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
    await createAdminNotification(businessId, 'booking_modified', {
      title: 'Occurrence cancellation approved',
      message: `Approved cancellation for ${datesToApprove.join(', ')} on ${bkRef}.`,
      link: '/admin/bookings?tab=cancelled&cancelView=cancelled',
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (e) {
    console.error('admin/bookings cancellation-request POST:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
