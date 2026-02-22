import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET: List completed bookings for charges
 * Query: tab=pending|declined|all, dateFrom, dateTo, search, frequency
 */
export async function GET(request: NextRequest) {
  try {
    const businessId = request.headers.get('x-business-id') || request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const tab = request.nextUrl.searchParams.get('tab') || 'pending';
    const dateFrom = request.nextUrl.searchParams.get('dateFrom');
    const dateTo = request.nextUrl.searchParams.get('dateTo');
    const search = request.nextUrl.searchParams.get('search') || '';
    const frequency = request.nextUrl.searchParams.get('frequency') || '';

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from('bookings')
      .select(`
        id, service, scheduled_date, scheduled_time, total_price, customer_name,
        customer_email, customer_phone, payment_method, payment_status, status,
        provider_name, address, apt_no, zip_code, frequency
      `)
      .eq('business_id', businessId)
      .eq('status', 'completed')
      .order('scheduled_date', { ascending: false });

    if (tab === 'pending') {
      query = query.eq('payment_status', 'pending');
    } else if (tab === 'declined') {
      query = query.eq('payment_status', 'declined');
    }
    // tab === 'all': no payment_status filter

    if (dateFrom) query = query.gte('scheduled_date', dateFrom);
    if (dateTo) query = query.lte('scheduled_date', dateTo);
    if (frequency && frequency !== 'all') query = query.eq('frequency', frequency);

    const { data: bookings } = await query;

    let filtered = bookings ?? [];
    if (search.trim()) {
      const s = search.toLowerCase().trim();
      filtered = filtered.filter(
        (b: Record<string, unknown>) =>
          String(b.customer_name ?? '').toLowerCase().includes(s) ||
          String(b.customer_email ?? '').toLowerCase().includes(s) ||
          String(b.customer_phone ?? '').toLowerCase().includes(s) ||
          String(b.id ?? '').toLowerCase().includes(s) ||
          String(b.address ?? '').toLowerCase().includes(s)
      );
    }

    return NextResponse.json({ bookings: filtered });
  } catch (e) {
    console.error('Booking charges GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
