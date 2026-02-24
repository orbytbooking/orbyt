import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

type ClockAction = 'on_the_way' | 'at_location' | 'clocked_in' | 'lunch_break' | 'clocked_out';

/**
 * GET: Fetch current time log for a booking
 * Query: ?bookingId=...
 * Auth: Bearer token from provider session.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = request.nextUrl.searchParams.get('bookingId');
    const occurrenceDate = request.nextUrl.searchParams.get('occurrence_date')?.slice(0, 10) || null;
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: provider } = await supabaseAdmin
      .from('service_providers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    let query = supabaseAdmin
      .from('booking_time_logs')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('provider_id', provider.id);
    if (occurrenceDate) {
      query = query.eq('occurrence_date', occurrenceDate);
    } else {
      query = query.is('occurrence_date', null);
    }
    const { data: timeLog } = await query.maybeSingle();

    return NextResponse.json({ timeLog: timeLog ?? null });
  } catch (e) {
    console.error('Provider clock GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST: Update provider status for a booking (clock in/out flow)
 * Body: { bookingId: string, action: 'on_the_way' | 'at_location' | 'clocked_in' | 'lunch_break' | 'clocked_out' }
 * Auth: Bearer token from provider session.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, action, occurrence_date: bodyOccurrenceDate } = body as { bookingId: string; action: ClockAction; occurrence_date?: string };
    const occurrenceDate = bodyOccurrenceDate ? String(bodyOccurrenceDate).slice(0, 10) : null;

    if (!bookingId || !action || !['on_the_way', 'at_location', 'clocked_in', 'lunch_break', 'clocked_out'].includes(action)) {
      return NextResponse.json({ error: 'Invalid bookingId or action' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: provider } = await supabaseAdmin
      .from('service_providers')
      .select('id, business_id')
      .eq('user_id', user.id)
      .single();

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }
    if (!provider.business_id) {
      console.error('Provider has no business_id:', provider.id);
      return NextResponse.json({ error: 'Provider is not linked to a business' }, { status: 400 });
    }

    const { data: optsRow, error: optsError } = await supabaseAdmin
      .from('business_store_options')
      .select('*')
      .eq('business_id', provider.business_id)
      .maybeSingle();

    if (optsError) {
      console.error('Store options fetch error:', optsError);
      return NextResponse.json({ error: 'Could not load clock settings' }, { status: 500 });
    }
    const opts = optsRow as { clock_in_out_enabled?: boolean; completion_on_clock_out?: boolean; allow_reclock_in?: boolean } | null;
    const clockEnabled = opts == null ? true : (opts.clock_in_out_enabled === true);
    if (!clockEnabled) {
      return NextResponse.json({ error: 'Clock in/out is not enabled for this business' }, { status: 403 });
    }

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, provider_id, business_id, recurring_series_id')
      .eq('id', bookingId)
      .eq('business_id', provider.business_id)
      .single();

    if (!booking || booking.provider_id !== provider.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const isRecurring = !!(booking as { recurring_series_id?: string }).recurring_series_id;
    const logOccurrenceDate = isRecurring && occurrenceDate ? occurrenceDate : null;

    let existingLogQuery = supabaseAdmin
      .from('booking_time_logs')
      .select('id, clocked_in_at, clocked_out_at')
      .eq('booking_id', bookingId)
      .eq('provider_id', provider.id);
    if (logOccurrenceDate) {
      existingLogQuery = existingLogQuery.eq('occurrence_date', logOccurrenceDate);
    } else {
      existingLogQuery = existingLogQuery.is('occurrence_date', null);
    }
    const { data: existingLog } = await existingLogQuery.maybeSingle();

    if (action === 'clocked_in' && existingLog?.clocked_out_at && !opts?.allow_reclock_in) {
      return NextResponse.json(
        { error: 'Re-clock in is not allowed. You have already clocked out for this booking.' },
        { status: 403 }
      );
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
    }
    // Move booking to in_progress when provider starts time tracking (on the way, at location, or clocked in)
    if (['on_the_way', 'at_location', 'clocked_in'].includes(action)) {
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'in_progress', updated_at: now })
        .eq('id', bookingId);
    }

    if (action === 'lunch_break') {
      providerStatus = 'lunch_break';
      updates.lunch_start_at = now;
    } else if (action === 'clocked_out') {
      providerStatus = 'completed';
      updates.clocked_out_at = now;
      if (opts?.completion_on_clock_out !== false) {
        if (isRecurring && logOccurrenceDate) {
          const { data: row } = await supabaseAdmin
            .from('bookings')
            .select('completed_occurrence_dates')
            .eq('id', bookingId)
            .single();
          const list = Array.isArray((row as { completed_occurrence_dates?: string[] } | null)?.completed_occurrence_dates)
            ? (row as { completed_occurrence_dates: string[] }).completed_occurrence_dates
            : [];
          if (!list.includes(logOccurrenceDate)) {
            await supabaseAdmin
              .from('bookings')
              .update({
                completed_occurrence_dates: [...list, logOccurrenceDate],
                updated_at: now,
              })
              .eq('id', bookingId)
              .eq('provider_id', provider.id)
              .eq('business_id', provider.business_id);
          }
        } else {
          const { error: bookingUpdateErr } = await supabaseAdmin
            .from('bookings')
            .update({ status: 'completed', updated_at: now })
            .eq('id', bookingId);
          if (bookingUpdateErr) {
            console.error('Clock out: failed to set booking completed', bookingUpdateErr.message);
          }
        }
      }
    }

    updates.provider_status = providerStatus;

    if (action === 'clocked_out' && existingLog?.clocked_in_at) {
      const timeReported = Math.round(
        (new Date(now).getTime() - new Date(existingLog.clocked_in_at).getTime()) / 60000
      );
      updates.time_reported_minutes = timeReported;
    }

    if (existingLog?.id) {
      let updateQuery = supabaseAdmin
        .from('booking_time_logs')
        .update(updates)
        .eq('booking_id', bookingId)
        .eq('provider_id', provider.id)
        .eq('id', existingLog.id);
      const { data, error } = await updateQuery.select().single();

      if (error) {
        console.error('Clock update error:', error.message, error.code, error.details);
        return NextResponse.json(
          { error: 'Failed to update time log', details: error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, timeLog: data });
    }

    const insertRow: Record<string, unknown> = {
      booking_id: bookingId,
      provider_id: provider.id,
      business_id: provider.business_id,
      occurrence_date: logOccurrenceDate ?? null,
      provider_status: providerStatus,
      updated_at: updates.updated_at,
      on_the_way_at: updates.on_the_way_at ?? null,
      at_location_at: updates.at_location_at ?? null,
      clocked_in_at: updates.clocked_in_at ?? null,
      clocked_out_at: updates.clocked_out_at ?? null,
      lunch_start_at: updates.lunch_start_at ?? null,
      time_reported_minutes: updates.time_reported_minutes ?? null,
    };

    let { data, error } = await supabaseAdmin
      .from('booking_time_logs')
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        let conflictQuery = supabaseAdmin
          .from('booking_time_logs')
          .update(updates)
          .eq('booking_id', bookingId)
          .eq('provider_id', provider.id);
        if (logOccurrenceDate) conflictQuery = conflictQuery.eq('occurrence_date', logOccurrenceDate);
        else conflictQuery = conflictQuery.is('occurrence_date', null);
        const { data: updated, error: updateErr } = await conflictQuery.select().single();
        if (updateErr) {
          console.error('Clock update-after-insert error:', updateErr.message, updateErr.code);
          return NextResponse.json(
            { error: 'Failed to update time log', details: updateErr.message },
            { status: 500 }
          );
        }
        return NextResponse.json({ success: true, timeLog: updated });
      }
      console.error('Clock insert error:', error.message, error.code, error.details);
      return NextResponse.json(
        { error: 'Failed to create time log', details: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, timeLog: data });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('Provider clock POST:', err.message, err.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}
