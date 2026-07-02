import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assertUserHasAdminModuleAccess } from '@/lib/bookingApiAuth';
import type { CancellationSettingsPayload } from '@/app/api/admin/cancellation-settings/route';
import {
  filterCancellationReasonsForCancel,
  isBookingRecurring,
  type CancellationReasonRecord,
} from '@/lib/cancellationReasons';

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

export async function GET(
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

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select(
        'id, status, frequency, recurring_series_id, service_id, exclude_cancellation_fee, scheduled_date, date'
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

    const { data: reasonRows, error: reasonsErr } = await supabase
      .from('cancellation_reasons')
      .select(
        'id, label, display_order, is_active, applies_one_time, applies_recurring, applicable_cancel_all_recurring, applicable_cancel_single, applicable_exclude_cancellation_fee, applicable_exclude_after_first_fee'
      )
      .eq('business_id', businessId)
      .order('display_order', { ascending: true });

    if (reasonsErr) {
      return NextResponse.json({ error: reasonsErr.message }, { status: 500 });
    }

    const isRecurring = isBookingRecurring(booking);
    const context = {
      isRecurring,
      cancelScope: 'full' as const,
      excludeCancellationFee: !!booking.exclude_cancellation_fee,
      serviceCategoryId: booking.service_id ?? null,
    };

    const commentBoxEnabled =
      settings.cancellationCommentBox !== 'no' &&
      ((!isRecurring && settings.cancellationBookingTypeOneTime !== false) ||
        (isRecurring && settings.cancellationBookingTypeRecurring !== false));

    const reasons = filterCancellationReasonsForCancel(
      (reasonRows || []) as CancellationReasonRecord[],
      context,
      settings
    );

    return NextResponse.json({
      settings: {
        reasonsSetup: settings.cancellationReasonsSetup === 'no' ? 'no' : 'yes',
        reasonOptional: settings.cancellationReasonOptional === 'yes' ? 'yes' : 'no',
        commentBox: commentBoxEnabled ? 'yes' : 'no',
        bookingTypeOneTime: settings.cancellationBookingTypeOneTime !== false,
        bookingTypeRecurring: settings.cancellationBookingTypeRecurring !== false,
      },
      reasons,
      booking: {
        id: booking.id,
        isRecurring,
        excludeCancellationFee: !!booking.exclude_cancellation_fee,
        serviceCategoryId: booking.service_id ?? null,
      },
    });
  } catch (e) {
    console.error('admin/bookings cancel-options GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
