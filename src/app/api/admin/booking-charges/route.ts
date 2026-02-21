import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

/**
 * GET: List completed bookings pending charge (Booking Koala style)
 */
export async function GET(request: NextRequest) {
  try {
    const businessId = request.headers.get('x-business-id') || request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        id, service, scheduled_date, scheduled_time, total_price, customer_name,
        customer_email, payment_method, payment_status, status
      `)
      .eq('business_id', businessId)
      .eq('status', 'completed')
      .eq('payment_status', 'pending')
      .order('scheduled_date', { ascending: false });

    return NextResponse.json({ bookings: bookings ?? [] });
  } catch (e) {
    console.error('Booking charges GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
