import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { MultiTenantHelper } from '@/lib/multiTenantSupabase';
import { createAdminNotification } from '@/lib/adminProviderSync';

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

    // Resolve customer_id: use provided id, or lookup/create by email so admin-created bookings link to customers
    let customerId: string | null = bookingData.customer_id && typeof bookingData.customer_id === 'string' ? bookingData.customer_id.trim() || null : null;
    const customerEmail = (bookingData.customer_email || '').toString().trim();
    const customerName = (bookingData.customer_name || '').toString().trim();
    const customerPhone = (bookingData.customer_phone || '').toString().trim() || null;
    const customerAddress = (bookingData.address || '').toString().trim() || null;
    if (!customerId && customerEmail) {
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', businessId)
        .eq('email', customerEmail)
        .maybeSingle();
      if (existing?.id) {
        customerId = existing.id;
      } else if (customerName || customerEmail) {
        const { data: created } = await supabase
          .from('customers')
          .insert({
            business_id: businessId,
            name: customerName || customerEmail,
            email: customerEmail,
            phone: customerPhone,
            address: customerAddress,
          })
          .select('id')
          .single();
        if (created?.id) customerId = created.id;
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
      customer_id: customerId,
      amount: bookingData.amount || 0,
    };

    // Build customization from admin payload (partial cleaning, exclude areas/quantities, extras, etc.)
    const hasPartialCleaning = Boolean(bookingData.is_partial_cleaning);
    const excludedAreas = Array.isArray(bookingData.excluded_areas) ? bookingData.excluded_areas : [];
    const excludeQuantities = bookingData.exclude_quantities && typeof bookingData.exclude_quantities === 'object' && !Array.isArray(bookingData.exclude_quantities)
      ? bookingData.exclude_quantities
      : {};
    const hasCustomization = hasPartialCleaning || excludedAreas.length > 0 || Object.keys(excludeQuantities).length > 0 ||
      (Array.isArray(bookingData.selected_extras) && bookingData.selected_extras.length > 0) ||
      (bookingData.extra_quantities && typeof bookingData.extra_quantities === 'object' && Object.keys(bookingData.extra_quantities).length > 0) ||
      (bookingData.category_values && typeof bookingData.category_values === 'object' && Object.keys(bookingData.category_values).length > 0);
    if (hasCustomization) {
      bookingWithBusiness.customization = {
        ...(bookingData.customization && typeof bookingData.customization === 'object' ? bookingData.customization : {}),
        isPartialCleaning: hasPartialCleaning,
        excludedAreas,
        excludeQuantities,
        selectedExtras: Array.isArray(bookingData.selected_extras) ? bookingData.selected_extras : [],
        extraQuantities: bookingData.extra_quantities && typeof bookingData.extra_quantities === 'object' ? bookingData.extra_quantities : {},
        categoryValues: bookingData.category_values && typeof bookingData.category_values === 'object' ? bookingData.category_values : {},
      };
    }

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
      
      // If error is about missing columns (provider_wage or customization), retry without them
      const msg = bookingError.message || '';
      let didStrip = false;
      if (msg.includes('provider_wage')) {
        console.log('⚠️ provider_wage columns not found, retrying without them...');
        delete bookingWithBusiness.provider_wage;
        delete bookingWithBusiness.provider_wage_type;
        didStrip = true;
      }
      if (msg.includes('customization')) {
        console.log('⚠️ customization column not found, retrying without it...');
        delete bookingWithBusiness.customization;
        didStrip = true;
      }
      if (didStrip) {
        const { data: retryBooking, error: retryError } = await supabase
          .from('bookings')
          .insert(bookingWithBusiness)
          .select()
          .single();
        if (retryError) {
          console.error('❌ Retry booking creation error:', retryError);
          return NextResponse.json({
            error: retryError.message,
            details: 'Run migrations 012 and 018 for full booking features.'
          }, { status: 500 });
        }
        const warning = msg.includes('customization')
          ? 'Customization column not found. Run migration 018 to save exclude quantities and partial cleaning.'
          : (msg.includes('provider_wage') ? 'Run migration 012 for provider wage.' : '');
        const bkRef = `BK${String(retryBooking.id).slice(-6).toUpperCase()}`;
        const assignMsg = retryBooking.provider_id ? ' and assigned to provider' : '';
        await createAdminNotification(businessId, 'new_booking', {
          title: retryBooking.provider_id ? 'Booking assigned' : 'New booking confirmed',
          message: `Booking ${bkRef} has been confirmed${assignMsg}.`,
          link: '/admin/bookings',
        });
        return NextResponse.json({
          success: true,
          data: retryBooking,
          message: 'Booking created successfully',
          ...(warning ? { warning } : {})
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

    const bkRef = `BK${String(booking.id).slice(-6).toUpperCase()}`;
    const assignMsg = booking.provider_id ? ' and assigned to provider' : '';
    await createAdminNotification(businessId, 'new_booking', {
      title: booking.provider_id ? 'Booking assigned' : 'New booking confirmed',
      message: `Booking ${bkRef} has been confirmed${assignMsg}.`,
      link: '/admin/bookings',
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
