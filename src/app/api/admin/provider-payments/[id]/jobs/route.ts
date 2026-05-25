import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET: List provider earnings rows with booking details for job listing modal.
 * Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: providerId } = await params;
    const businessId = request.headers.get('x-business-id') || request.nextUrl.searchParams.get('businessId');
    if (!businessId || !providerId) {
      return NextResponse.json({ error: 'Business ID and provider ID required' }, { status: 400 });
    }

    const startDate = request.nextUrl.searchParams.get('startDate');
    const endDate = request.nextUrl.searchParams.get('endDate');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from('provider_earnings')
      .select(`
        id,
        booking_id,
        net_amount,
        status,
        created_at,
        bookings(
          id,
          scheduled_date,
          date,
          service,
          customer_name,
          status
        )
      `)
      .eq('provider_id', providerId)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
    if (endDate) query = query.lte('created_at', `${endDate}T23:59:59.999Z`);

    const { data, error } = await query.limit(200);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const jobs = (data ?? []).map((row: any) => ({
      id: row.id,
      bookingId: row.booking_id,
      date: row.bookings?.scheduled_date || row.bookings?.date || row.created_at?.slice(0, 10) || '',
      service: row.bookings?.service || 'Service',
      customerName: row.bookings?.customer_name || 'Customer',
      bookingStatus: row.bookings?.status || 'unknown',
      payoutStatus: row.status || 'pending',
      amount: Number(row.net_amount || 0),
      createdAt: row.created_at,
    }));

    return NextResponse.json({ jobs });
  } catch (e) {
    console.error('Provider jobs GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
