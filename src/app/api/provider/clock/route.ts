import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseProviderClient } from '@/lib/supabaseProviderClient';

type ClockAction = 'on_the_way' | 'at_location' | 'clocked_in' | 'lunch_break' | 'clocked_out';

/**
 * GET: Fetch current time log for a booking
 * Query: ?bookingId=...
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseProvider = getSupabaseProviderClient();
    const { data: { session }, error: authError } = await supabaseProvider.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = request.nextUrl.searchParams.get('bookingId');
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: provider } = await supabaseAdmin
      .from('service_providers')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const { data: timeLog } = await supabaseAdmin
      .from('booking_time_logs')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('provider_id', provider.id)
      .maybeSingle();

    return NextResponse.json({ timeLog: timeLog ?? null });
  } catch (e) {
    console.error('Provider clock GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST: Update provider status for a booking (clock in/out flow)
 * Body: { bookingId: string, action: 'on_the_way' | 'at_location' | 'clocked_in' | 'lunch_break' | 'clocked_out' }
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseProvider = getSupabaseProviderClient();
    const { data: { session }, error: authError } = await supabaseProvider.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, action } = body as { bookingId: string; action: ClockAction };

    if (!bookingId || !action || !['on_the_way', 'at_location', 'clocked_in', 'lunch_break', 'clocked_out'].includes(action)) {
      return NextResponse.json({ error: 'Invalid bookingId or action' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: provider } = await supabaseAdmin
      .from('service_providers')
      .select('id, business_id')
      .eq('user_id', session.user.id)
      .single();

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const { data: opts } = await supabaseAdmin
      .from('business_store_options')
      .select('clock_in_out_enabled')
      .eq('business_id', provider.business_id)
      .maybeSingle();

    if (!opts?.clock_in_out_enabled) {
      return NextResponse.json({ error: 'Clock in/out is not enabled' }, { status: 403 });
    }

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, provider_id, business_id')
      .eq('id', bookingId)
      .eq('business_id', provider.business_id)
      .single();

    if (!booking || booking.provider_id !== provider.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    let providerStatus = 'on_the_way';
    const updates: Record<string, unknown> = { updated_at: now };

    if (action === 'on_the_way') {
      providerStatus = 'on_the_way';
      updates.on_the_way_at = now;
    } else if (action === 'at_location') {
      providerStatus = 'at_location';
      updates.at_location_at = now;
    } else if (action === 'clocked_in') {
      providerStatus = 'clocked_in';
      updates.clocked_in_at = now;
      // Update booking status to in_progress
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'in_progress', updated_at: now })
        .eq('id', bookingId);
    } else if (action === 'lunch_break') {
      providerStatus = 'lunch_break';
      updates.lunch_start_at = now;
    } else if (action === 'clocked_out') {
      providerStatus = 'completed';
      updates.clocked_out_at = now;
      // Update booking status to completed
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'completed', updated_at: now })
        .eq('id', bookingId);
    }

    updates.provider_status = providerStatus;

    const { data: existingLog } = await supabaseAdmin
      .from('booking_time_logs')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (action === 'clocked_out' && existingLog?.clocked_in_at) {
      const timeReported = Math.round(
        (new Date(now).getTime() - new Date(existingLog.clocked_in_at).getTime()) / 60000
      );
      updates.time_reported_minutes = timeReported;
    }

    if (existingLog?.id) {
      const { data, error } = await supabaseAdmin
        .from('booking_time_logs')
        .update(updates)
        .eq('booking_id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('Clock update error:', error);
        return NextResponse.json({ error: 'Failed to update time log' }, { status: 500 });
      }
      return NextResponse.json({ success: true, timeLog: data });
    }

    const { data, error } = await supabaseAdmin
      .from('booking_time_logs')
      .insert({
        booking_id: bookingId,
        provider_id: provider.id,
        business_id: provider.business_id,
        provider_status,
        ...updates,
      })
      .select()
      .single();

    if (error) {
      console.error('Clock insert error:', error);
      return NextResponse.json({ error: 'Failed to create time log' }, { status: 500 });
    }
    return NextResponse.json({ success: true, timeLog: data });
  } catch (e) {
    console.error('Provider clock:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
