import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get('business_id');

    if (!business_id) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('business_id', business_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }

    // Transform data to match the expected Customer interface
    const transformedData = data?.map((customer: any) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      address: customer.address || '',
      joinDate: customer.join_date || customer.created_at,
      totalBookings: customer.total_bookings || 0,
      totalSpent: customer.total_spent ? `$${customer.total_spent.toFixed(2)}` : '$0.00',
      status: customer.status || 'active',
      lastBooking: customer.last_booking || null,
    })) || [];

    return NextResponse.json({ data: transformedData });
  } catch (error) {
    console.error('Error in customers GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
