import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assertUserHasAdminModuleAccess } from '@/lib/bookingApiAuth';
import { createAdminNotification } from '@/lib/adminProviderSync';
import { getCancellationFeeForBooking } from '@/lib/cancellationFee';
import { syncBookingCancelled } from '@/lib/googleCalendar';
import { restoreGiftCardRedemptionForBooking } from '@/lib/giftCardLifecycle';
import type { CancellationSettingsPayload } from '@/app/api/admin/cancellation-settings/route';
import {
  filterCancellationReasonsForCancel,
  isBookingRecurring,
  pickCancellationReasonFields,
  type CancellationReasonRecord,
} from '@/lib/cancellationReasons';
import {
  isMissingCancellationColumnError,
  mergeCancellationMetaIntoCustomization,
} from '@/lib/bookingCancellationMeta';

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

  return { supabase, businessId, user };
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
    const cancellationReasonId =
      typeof body.cancellationReasonId === 'string' ? body.cancellationReasonId.trim() : '';
    const cancellationComment =
      typeof body.cancellationComment === 'string' ? body.cancellationComment.trim() : '';

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select(
        'id, status, business_id, scheduled_date, scheduled_time, date, time, service_id, exclude_cancellation_fee, frequency, recurring_series_id, customization'
      )
      .eq('id', bookingId)
      .eq('business_id', businessId)
      .maybeSingle();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
    }

    const { data: settingsRow } = await supabase
      .from('business_cancellation_settings')
      .select('settings')
      .eq('business_id', businessId)
      .maybeSingle();

    const settings = (settingsRow?.settings as CancellationSettingsPayload) || {};
    const reasonsSetup = settings.cancellationReasonsSetup !== 'no';
    const reasonOptional = settings.cancellationReasonOptional === 'yes';
    const isRecurring = isBookingRecurring(booking);
    const commentBoxEnabled =
      settings.cancellationCommentBox !== 'no' &&
      ((!isRecurring && settings.cancellationBookingTypeOneTime !== false) ||
        (isRecurring && settings.cancellationBookingTypeRecurring !== false));

    const context = {
      isRecurring,
      cancelScope: 'full' as const,
      excludeCancellationFee: !!booking.exclude_cancellation_fee,
      serviceCategoryId: booking.service_id ?? null,
    };

    let selectedReason: CancellationReasonRecord | null = null;
    if (reasonsSetup) {
      const { data: reasonRows, error: reasonsErr } = await supabase
        .from('cancellation_reasons')
        .select(
          'id, label, display_order, is_active, applies_one_time, applies_recurring, applicable_cancel_all_recurring, applicable_cancel_single, applicable_exclude_cancellation_fee, applicable_exclude_after_first_fee'
        )
        .eq('business_id', businessId);

      if (reasonsErr) {
        return NextResponse.json({ error: reasonsErr.message }, { status: 500 });
      }

      const available = filterCancellationReasonsForCancel(
        (reasonRows || []) as CancellationReasonRecord[],
        context,
        settings
      );

      if (available.length > 0) {
        if (!cancellationReasonId && !reasonOptional) {
          return NextResponse.json({ error: 'Please select a cancellation reason' }, { status: 400 });
        }
        if (cancellationReasonId) {
          selectedReason = available.find((r) => r.id === cancellationReasonId) ?? null;
          if (!selectedReason) {
            return NextResponse.json({ error: 'Invalid cancellation reason' }, { status: 400 });
          }
        }
      }
    }

    const reasonFields = pickCancellationReasonFields(selectedReason);
    const cancellationMeta = {
      reasonId: reasonFields.cancellation_reason_id,
      reasonLabel: reasonFields.cancellation_reason_label,
      comment: commentBoxEnabled && cancellationComment ? cancellationComment : null,
    };

    const updates: Record<string, unknown> = {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
      ...reasonFields,
      cancellation_comment: cancellationMeta.comment,
    };

    if (booking.exclude_cancellation_fee) {
      updates.cancellation_fee_amount = null;
      updates.cancellation_fee_currency = null;
    } else {
      const { data: cancelSettings } = await supabase
        .from('business_cancellation_settings')
        .select('settings')
        .eq('business_id', businessId)
        .maybeSingle();

      let categoryFee = null;
      if (booking.service_id) {
        categoryFee = await getServiceCategoryCancellationFee(
          supabase,
          businessId,
          booking.service_id
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
      } else {
        updates.cancellation_fee_amount = null;
        updates.cancellation_fee_currency = null;
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
      const fallbackUpdates: Record<string, unknown> = {
        status: updates.status,
        updated_at: updates.updated_at,
        cancellation_fee_amount: updates.cancellation_fee_amount,
        cancellation_fee_currency: updates.cancellation_fee_currency,
        customization: mergeCancellationMetaIntoCustomization(booking.customization, cancellationMeta),
      };

      ({ data: updated, error: updateErr } = await supabase
        .from('bookings')
        .update(fallbackUpdates)
        .eq('id', bookingId)
        .eq('business_id', businessId)
        .select('*')
        .single());
    }

    if (updateErr) {
      console.error('admin/bookings cancel POST:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    await syncBookingCancelled(businessId, updated).catch(() => {});

    const giftRestore = await restoreGiftCardRedemptionForBooking(supabase, businessId, bookingId);
    if (!giftRestore.ok) {
      console.warn('[admin/bookings/cancel] gift card restore:', giftRestore.message);
    }

    const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
    const reasonSuffix = selectedReason ? ` Reason: ${selectedReason.label}.` : '';
    await createAdminNotification(businessId, 'booking_modified', {
      title: 'Booking cancelled',
      message: `Booking ${bkRef} was cancelled by admin.${reasonSuffix}`,
      link: '/admin/bookings',
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (e) {
    console.error('admin/bookings cancel POST:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
