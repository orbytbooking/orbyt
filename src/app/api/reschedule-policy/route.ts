import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  getReschedulePolicyDisplay,
  type BusinessRescheduleSettings,
} from '@/lib/rescheduleFee';

/**
 * GET ?businessId=xxx&bookingTotal=123.45
 * Returns the business reschedule fee policy for customer display (amount/type from admin settings).
 */
export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const bookingTotalRaw = request.nextUrl.searchParams.get('bookingTotal');
    const bookingTotal =
      bookingTotalRaw != null && bookingTotalRaw.trim() !== ''
        ? parseFloat(bookingTotalRaw)
        : null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('business_reschedule_settings')
      .select('settings')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      console.error('Reschedule policy fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = (data?.settings as BusinessRescheduleSettings) || null;
    const policy = getReschedulePolicyDisplay(settings, bookingTotal);

    return NextResponse.json(policy);
  } catch (e) {
    console.error('Reschedule policy GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
