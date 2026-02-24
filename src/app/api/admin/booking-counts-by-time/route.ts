import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBookingCountByTimeForDate, getBookingCountForDate } from '@/lib/schedulingFilters';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** GET - Booking counts per time for a date (for Daily Settings grid) */
export async function GET(request: NextRequest) {
  try {
    const businessId = request.headers.get('x-business-id') || request.nextUrl.searchParams.get('businessId');
    const date = request.nextUrl.searchParams.get('date'); // YYYY-MM-DD
    if (!businessId || !date) {
      return NextResponse.json({ error: 'businessId and date required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
    const countsByTime = await getBookingCountByTimeForDate(supabase, businessId, date);
    const totalScheduled = await getBookingCountForDate(supabase, businessId, date);

    return NextResponse.json({ countsByTime, totalScheduled });
  } catch (e) {
    console.error('Booking counts by time GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
