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

    // Prepare booking data with only fields that exist in database schema
    // If provider is assigned, set status to 'confirmed' automatically
    const finalStatus = bookingData.service_provider_id 
      ? (bookingData.status === 'pending' ? 'confirmed' : bookingData.status)
      : (bookingData.status || 'pending');
    
    // Parse provider wage if provided
    let providerWage = null;
    let providerWageType = null;
    if (bookingData.provider_wage && bookingData.provider_wage_type) {
      const wageValue = parseFloat(bookingData.provider_wage);
      if (!isNaN(wageValue) && wageValue >= 0) {
        providerWage = wageValue;
        providerWageType = bookingData.provider_wage_type; // 'percentage', 'fixed', or 'hourly'
      }
    }

    const bookingWithBusiness: any = {
      business_id: businessId,
      provider_id: bookingData.service_provider_id || null,
      service_id: null, // You may need to map service to service_id
      status: finalStatus,
      scheduled_date: bookingData.date || null,
      scheduled_time: bookingData.time || null,
      address: bookingData.address || 'Default Address', // REQUIRED FIELD - you need to collect this
      apt_no: bookingData.apt_no || null,
      zip_code: bookingData.zip_code || null,
      notes: bookingData.notes || '',
      total_price: bookingData.amount || 0,
      payment_method: paymentMethod,
      payment_status: 'pending',
      tip_amount: 0,
      customer_email: bookingData.customer_email || null,
      customer_name: bookingData.customer_name || null,
      customer_phone: bookingData.customer_phone || null,
      service: bookingData.service || null,
      date: bookingData.date || null,
      time: bookingData.time || null,
      customer_id: null, // You may need to map customer email to customer_id
      amount: bookingData.amount || 0,
    };

    // Only include provider_wage fields if they have valid values
    // This allows the code to work even if the migration hasn't been run yet
    if (providerWage !== null && providerWageType !== null) {
      bookingWithBusiness.provider_wage = providerWage;
      bookingWithBusiness.provider_wage_type = providerWageType;
    }

    // Insert booking directly
    console.log('📝 Creating booking with data:', {
      business_id: businessId,
      provider_id: bookingWithBusiness.provider_id,
      status: bookingWithBusiness.status,
      customer_name: bookingWithBusiness.customer_name,
      date: bookingWithBusiness.scheduled_date || bookingWithBusiness.date,
      time: bookingWithBusiness.scheduled_time || bookingWithBusiness.time
    });
    
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingWithBusiness)
      .select()
      .single();

    if (bookingError) {
      console.error('❌ Booking creation error:', bookingError);
      console.error('❌ Booking data attempted:', JSON.stringify(bookingWithBusiness, null, 2));
      
      // If error is about missing columns (provider_wage), try again without them
      if (bookingError.message && bookingError.message.includes('provider_wage')) {
        console.log('⚠️ provider_wage columns not found, retrying without them...');
        delete bookingWithBusiness.provider_wage;
        delete bookingWithBusiness.provider_wage_type;
        
        const { data: retryBooking, error: retryError } = await supabase
          .from('bookings')
          .insert(bookingWithBusiness)
          .select()
          .single();
          
        if (retryError) {
          console.error('❌ Retry booking creation error:', retryError);
          return NextResponse.json({ 
            error: retryError.message,
            details: 'Please run migration 012_add_provider_wage_to_bookings.sql to enable provider wage features'
          }, { status: 500 });
        }
        
        console.log('✅ Booking created without provider_wage columns');
        return NextResponse.json({
          success: true,
          data: retryBooking,
          message: retryBooking?.provider_id 
            ? 'Booking created successfully and assigned to provider (provider_wage columns not available)'
            : 'Booking created successfully (provider_wage columns not available)',
          warning: 'Provider wage columns not found. Run migration 012_add_provider_wage_to_bookings.sql'
        });
      }
      
      return NextResponse.json({ 
        error: bookingError.message,
        code: bookingError.code,
        details: bookingError.details,
        hint: bookingError.hint
      }, { status: 500 });
    }

    console.log('✅ Booking created successfully:', {
      id: booking.id,
      provider_id: booking.provider_id,
      status: booking.status
    });

    return NextResponse.json({
      success: true,
      data: booking,
      message: booking.provider_id 
        ? 'Booking created successfully and assigned to provider'
        : 'Booking created successfully'
    });

  } catch (error) {
    console.error('Create booking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
