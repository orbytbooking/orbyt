/**
 * Auto-complete bookings when job length has passed (for businesses with automatic completion mode).
 * Call this via Vercel Cron, cron-job.org, or similar.
 *
 * Set CRON_SECRET in env and pass as Authorization: Bearer <CRON_SECRET>
 * If CRON_SECRET is not set, the route will still run (for dev).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateProviderEarnings } from '@/lib/adminProviderSync';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase config');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const now = new Date();

    // Get businesses with automatic completion mode
    const { data: optsList, error: optsError } = await supabase
      .from('business_store_options')
      .select('business_id')
      .eq('booking_completion_mode', 'automatic');

    if (optsError || !optsList?.length) {
      return NextResponse.json({ completed: 0, message: 'No businesses with automatic completion' });
    }

    const businessIds = optsList.map((o) => o.business_id);
    let totalCompleted = 0;

    // Fetch bookings that are confirmed or in_progress and past their end time
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, business_id, provider_id, scheduled_date, scheduled_time, date, time, duration_minutes')
      .in('business_id', businessIds)
      .in('status', ['confirmed', 'in_progress']);

    if (error) {
      console.error('[auto-complete-bookings] Fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const toComplete: { id: string; business_id: string; provider_id: string | null }[] = [];

    for (const b of bookings || []) {
      const dateStr = b.scheduled_date || (b as { date?: string }).date;
      const timeStr = b.scheduled_time || (b as { time?: string }).time;
      if (!dateStr || !timeStr) continue;

      const durationMins = b.duration_minutes != null ? Number(b.duration_minutes) : 60;
      const timePart = String(timeStr).slice(0, 5);
      const [h, m] = timePart.split(':').map(Number);
      const start = new Date(dateStr);
      start.setHours(h || 0, m || 0, 0, 0);
      const end = new Date(start.getTime() + durationMins * 60 * 1000);

      if (end <= now) {
        toComplete.push({
          id: b.id,
          business_id: b.business_id,
          provider_id: b.provider_id,
        });
      }
    }

    for (const b of toComplete) {
      const { error: updateErr } = await supabase
        .from('bookings')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', b.id);

      if (updateErr) {
        console.error('[auto-complete-bookings] Update error:', b.id, updateErr);
        continue;
      }

      totalCompleted++;
      if (b.provider_id) {
        try {
          await calculateProviderEarnings(b.id, b.provider_id, b.business_id);
        } catch (e) {
          console.warn('[auto-complete-bookings] Earnings calc failed:', b.id, e);
        }
      }
    }

    return NextResponse.json({ completed: totalCompleted });
  } catch (e) {
    console.error('[auto-complete-bookings]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}
