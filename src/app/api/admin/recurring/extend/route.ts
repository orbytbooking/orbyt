import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { extendAllRecurringSeries } from '@/lib/recurringBookings';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** GET - Extend all active recurring series for the business (call on bookings/calendar load) */
export async function GET(request: NextRequest) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const businessId = request.headers.get('x-business-id') || request.nextUrl.searchParams.get('businessId');
  if (!businessId) {
    return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  const { extended, totalCreated } = await extendAllRecurringSeries(supabase, businessId);

  return NextResponse.json({
    success: true,
    extended,
    totalCreated,
  });
}
