import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { MultiTenantHelper } from '@/lib/multiTenantSupabase';

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get business context from headers
    const businessId = request.headers.get('x-business-id');
    if (!businessId) {
      return NextResponse.json({ error: 'Business context required' }, { status: 400 });
    }

    // Verify user has access to this business
    const { data: businessAccess, error: accessError } = await supabase
      .from('businesses')
      .select('id')
      .or(`owner_id.eq.${user.id},id.in.(SELECT business_id FROM tenant_users WHERE user_id = ${user.id} AND is_active = true)`)
      .eq('id', businessId)
      .single();

    if (accessError || !businessAccess) {
      return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 });
    }

    // Set business context and fetch bookings
    MultiTenantHelper.setBusinessContext(businessId);
    
    const { data: bookings, error: bookingsError } = MultiTenantHelper.filterBookings(
      supabase.from('bookings').select('*')
    );

    if (bookingsError) {
      return NextResponse.json({ error: bookingsError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: bookings,
      business_id: businessId,
      user_id: user.id
    });

  } catch (error) {
    console.error('Bookings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user session with token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Get business context from headers
    const businessId = request.headers.get('x-business-id');
    if (!businessId) {
      return NextResponse.json({ error: 'Business context required' }, { status: 400 });
    }

    // Verify user has permission to create bookings
    const { data: businessAccess, error: accessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('owner_id', user.id)
      .eq('id', businessId)
      .single();

    if (accessError || !businessAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const bookingData = await request.json();

    // Map payment method to valid database values
    let paymentMethod = 'cash'; // default
    if (bookingData.payment_method) {
      const method = bookingData.payment_method.toLowerCase();
      if (method === 'cash') {
        paymentMethod = 'cash';
      } else if (method.includes('card') || method.includes('bank') || method === 'credit card') {
        paymentMethod = 'online';
      }
    }

    // Add business_id and ensure total_price and payment_method are set
    const bookingWithBusiness = {
      ...bookingData,
      business_id: businessId, // Restore business_id for manual filtering
      total_price: bookingData.amount || 0, // Use amount or default to 0
      payment_method: paymentMethod, // Use mapped valid value
    };

    // Insert booking directly
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingWithBusiness)
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Booking created successfully'
    });

  } catch (error) {
    console.error('Create booking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
