import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== ENHANCED PROVIDERS API ===');
    
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Create admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Fetch enhanced provider data with all related information
    const { data: providers, error } = await supabaseAdmin
      .from('service_providers')
      .select(`
        *,
        provider_services(
          service_id,
          skill_level,
          is_primary_service,
          years_experience
        ),
        provider_pay_rates(
          service_id,
          rate_type,
          flat_rate,
          percentage_rate,
          hourly_rate,
          is_active
        ),
        provider_service_areas(
          area_name,
          city,
          state,
          radius_km,
          is_primary_area
        ),
        provider_capacity(
          max_concurrent_bookings,
          max_daily_bookings,
          max_weekly_bookings,
          current_workload
        ),
        provider_preferences(
          auto_assignments,
          email_notifications,
          advance_booking_days,
          minimum_booking_notice_hours
        )
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching enhanced providers:', error);
      return NextResponse.json(
        { error: `Failed to fetch providers: ${error.message}` },
        { status: 500 }
      );
    }

    // Transform data to include services and rates
    const enhancedProviders = providers?.map(provider => ({
      ...provider,
      services: provider.provider_services || [],
      payRates: provider.provider_pay_rates || [],
      serviceAreas: provider.provider_service_areas || [],
      capacity: provider.provider_capacity || null,
      preferences: provider.provider_preferences || null,
      // Calculate derived fields
      totalServices: provider.provider_services?.length || 0,
      activePayRates: provider.provider_pay_rates?.filter(pr => pr.is_active)?.length || 0,
      serviceAreaCount: provider.service_service_areas?.length || 0,
      currentWorkloadPercentage: provider.provider_capacity?.current_workload || 0,
      isAvailableForAutoAssignment: provider.preferences?.auto_assignments ?? true
    })) || [];

    return NextResponse.json({ 
      providers: enhancedProviders,
      count: enhancedProviders.length
    });

  } catch (error: any) {
    console.error('Enhanced providers API error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: 'Failed to fetch enhanced providers'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE ENHANCED PROVIDER API ===');
    
    const body = await request.json();
    const {
      // Basic provider info
      firstName,
      lastName,
      email,
      phone,
      address,
      type,
      businessId,
      
      // Enhanced provider info
      dateOfBirth,
      emergencyContactName,
      emergencyContactPhone,
      bio,
      skills,
      certifications,
      insuranceInfo,
      contractType,
      hourlyRate,
      currency,
      payoutMethod,
      payoutFrequency,
      payoutEmail,
      
      // Services and rates
      services,
      payRates,
      
      // Service areas
      serviceAreas,
      
      // Capacity and preferences
      capacity,
      preferences
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !address || !businessId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if provider already exists
    const { data: existingProvider } = await supabaseAdmin
      .from('service_providers')
      .select('id')
      .eq('email', email)
      .eq('business_id', businessId)
      .single();

    if (existingProvider) {
      return NextResponse.json(
        { error: 'A provider with this email already exists' },
        { status: 409 }
      );
    }

    // Start transaction
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('service_providers')
      .insert({
        business_id: businessId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        address,
        provider_type: type,
        status: 'active',
        
        // Enhanced fields
        date_of_birth: dateOfBirth,
        emergency_contact_name: emergencyContactName,
        emergency_contact_phone: emergencyContactPhone,
        bio,
        skills: skills || [],
        certifications: certifications || [],
        insurance_info: insuranceInfo,
        contract_type: contractType,
        hourly_rate: hourlyRate || 0,
        currency: currency || 'USD',
        payout_method: payoutMethod || 'bank_transfer',
        payout_frequency: payoutFrequency || 'weekly',
        payout_email: payoutEmail,
        total_earned: 0,
        total_paid_out: 0,
        current_balance: 0,
        availability_status: 'available',
        preferred_work_days: [1, 2, 3, 4, 5], // Monday-Friday
        preferred_work_start_time: '09:00:00',
        preferred_work_end_time: '17:00:00',
        timezone: 'UTC',
        languages: ['english'],
        notification_preferences: { email: true, sms: false, push: true },
        privacy_settings: { show_phone: true, show_email: true, show_address: false }
      })
      .select()
      .single();

    if (providerError) {
      console.error('Error creating provider:', providerError);
      return NextResponse.json(
        { error: 'Failed to create provider' },
        { status: 500 }
      );
    }

    // Create provider services
    if (services && services.length > 0) {
      const serviceData = services.map(service => ({
        provider_id: provider.id,
        service_id: service.serviceId,
        skill_level: service.skillLevel || 'basic',
        is_primary_service: service.isPrimaryService || false,
        years_experience: service.yearsExperience || 0
      }));

      await supabaseAdmin
        .from('provider_services')
        .insert(serviceData);
    }

    // Create provider pay rates
    if (payRates && payRates.length > 0) {
      const payRateData = payRates.map(rate => ({
        provider_id: provider.id,
        service_id: rate.serviceId,
        rate_type: rate.rateType || 'flat',
        flat_rate: rate.flatRate,
        percentage_rate: rate.percentageRate,
        hourly_rate: rate.hourlyRate,
        is_active: rate.isActive !== false
      }));

      await supabaseAdmin
        .from('provider_pay_rates')
        .insert(payRateData);
    }

    // Create service areas
    if (serviceAreas && serviceAreas.length > 0) {
      const serviceAreaData = serviceAreas.map(area => ({
        provider_id: provider.id,
        area_name: area.areaName,
        address: area.address,
        city: area.city,
        state: area.state,
        postal_code: area.postalCode,
        country: area.country || 'US',
        latitude: area.latitude,
        longitude: area.longitude,
        radius_km: area.radiusKm || 10,
        is_primary_area: area.isPrimaryArea || false
      }));

      await supabaseAdmin
        .from('provider_service_areas')
        .insert(serviceAreaData);
    }

    // Create capacity settings
    if (capacity) {
      await supabaseAdmin
        .from('provider_capacity')
        .insert({
          provider_id: provider.id,
          max_concurrent_bookings: capacity.maxConcurrentBookings || 1,
          max_daily_bookings: capacity.maxDailyBookings || 8,
          max_weekly_bookings: capacity.maxWeeklyBookings || 40,
          preferred_working_hours: capacity.preferredWorkingHours || 40,
          current_workload: 0
        });
    }

    // Create preferences
    if (preferences) {
      await supabaseAdmin
        .from('provider_preferences')
        .insert({
          provider_id: provider.id,
          auto_assignments: preferences.autoAssignments !== false,
          email_notifications: preferences.emailNotifications !== false,
          sms_notifications: preferences.smsNotifications || false,
          push_notifications: preferences.pushNotifications !== false,
          advance_booking_days: preferences.advanceBookingDays || 7,
          minimum_booking_notice_hours: preferences.minimumBookingNoticeHours || 2,
          accepts_emergency_bookings: preferences.acceptsEmergencyBookings || false,
          preferred_payment_methods: preferences.preferredPaymentMethods || ['bank_transfer']
        });
    }

    return NextResponse.json({
      success: true,
      provider: {
        id: provider.id,
        firstName: provider.first_name,
        lastName: provider.last_name,
        email: provider.email,
        phone: provider.phone,
        address: provider.address,
        type: provider.provider_type,
        status: provider.status,
        businessId: provider.business_id
      },
      message: 'Enhanced provider created successfully'
    });

  } catch (error: any) {
    console.error('Enhanced provider creation error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: 'Failed to create enhanced provider'
      },
      { status: 500 }
    );
  }
}
