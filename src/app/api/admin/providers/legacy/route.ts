import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== PROVIDERS API ===');
    
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
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

      // Fetch provider data
    const { data: providers, error } = await supabaseAdmin
      .from('service_providers')
      .select(`
        *,
        provider_services(
          service_id,
          skill_level,
          is_primary_service,
          years_experience,
          services(name, base_price)
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
          minimum_booking_notice_hours,
          accepts_emergency_bookings
        ),
        provider_earnings(
          id,
          booking_id,
          gross_amount,
          commission_amount,
          net_amount,
          status,
          created_at
        ),
        provider_reviews(
          rating,
          review_text,
          created_at
        )
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching providers:', error);
      return NextResponse.json(
        { error: `Failed to fetch providers: ${error.message}` },
        { status: 500 }
      );
    }

    // Transform data for provider workflow
    const formattedProviders = providers?.map(provider => {
      const earnings = provider.provider_earnings || [];
      const reviews = provider.provider_reviews || [];
      const services = provider.provider_services || [];
      const payRates = provider.provider_pay_rates || [];
      
      // Calculate totals
      const totalEarnings = earnings.reduce((sum, e) => sum + (e.net_amount || 0), 0);
      const pendingEarnings = earnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.net_amount || 0), 0);
      const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
      
      return {
        id: provider.id,
        name: `${provider.first_name} ${provider.last_name}`,
        firstName: provider.first_name,
        lastName: provider.last_name,
        email: provider.email,
        phone: provider.phone,
        address: provider.address,
        specialization: provider.specialization,
        status: provider.status,
        availabilityStatus: provider.availability_status || 'available',
        
        // Provider-specific fields
        hourlyRate: provider.hourly_rate || 0,
        payoutMethod: provider.payout_method || 'bank_transfer',
        totalEarned: provider.total_earned || 0,
        totalPaidOut: provider.total_paid_out || 0,
        currentBalance: provider.current_balance || 0,
        
        // Services they can do
        services: services.map(s => ({
          id: s.service_id,
          name: s.services?.name || 'Unknown Service',
          skillLevel: s.skill_level,
          isPrimaryService: s.is_primary_service,
          yearsExperience: s.years_experience,
          basePrice: s.services?.base_price || 0
        })),
        
        // Pay rates
        payRates: payRates.map(pr => ({
          serviceId: pr.service_id,
          rateType: pr.rate_type,
          flatRate: pr.flat_rate,
          percentageRate: pr.percentage_rate,
          hourlyRate: pr.hourly_rate,
          isActive: pr.is_active
        })),
        
        // Service areas
        serviceAreas: provider.provider_service_areas || [],
        
        // Capacity
        capacity: provider.provider_capacity ? {
          maxConcurrentBookings: provider.provider_capacity.max_concurrent_bookings,
          maxDailyBookings: provider.provider_capacity.max_daily_bookings,
          maxWeeklyBookings: provider.provider_capacity.max_weekly_bookings,
          currentWorkload: provider.provider_capacity.current_workload
        } : null,
        
        // Preferences
        preferences: provider.provider_preferences ? {
          autoAssignments: provider.provider_preferences.auto_assignments,
          emailNotifications: provider.provider_preferences.email_notifications,
          advanceBookingDays: provider.provider_preferences.advance_booking_days,
          minimumBookingNoticeHours: provider.provider_preferences.minimum_booking_notice_hours,
          acceptsEmergencyBookings: provider.provider_preferences.accepts_emergency_bookings
        } : null,
        
        // Calculated fields
        totalServices: services.length,
        activePayRates: payRates.filter(pr => pr.is_active).length,
        serviceAreaCount: provider.provider_service_areas?.length || 0,
        totalEarnings,
        pendingEarnings,
        averageRating,
        totalReviews: reviews.length,
        completedJobs: provider.completed_jobs || 0,
        rating: provider.rating || 0,
        
        // Dates
        createdAt: provider.created_at,
        updatedAt: provider.updated_at
      };
    }) || [];

    return NextResponse.json({ 
      providers: formattedProviders,
      count: formattedProviders.length
    });

  } catch (error: any) {
    console.error('Providers API error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: 'Failed to fetch providers'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE PROVIDER API ===');
    
    const body = await request.json();
    const {
      // Basic provider info
      firstName,
      lastName,
      email,
      phone,
      address,
      businessId,
      
      // Provider-specific
      hourlyRate,
      payoutMethod,
      specialization,
      
      // Services they can do
      services,
      
      // Pay rates
      payRates,
      
      // Service areas
      serviceAreas,
      
      // Capacity
      capacity,
      
      // Preferences
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

    // Create provider
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('service_providers')
      .insert({
        business_id: businessId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        address,
        specialization: specialization || 'General Services',
        status: 'active',
        provider_type: 'individual',
        
        // Provider fields
        hourly_rate: hourlyRate || 0,
        payout_method: payoutMethod || 'bank_transfer',
        total_earned: 0,
        total_paid_out: 0,
        current_balance: 0,
        availability_status: 'available'
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
          advance_booking_days: preferences.advanceBookingDays || 7,
          minimum_booking_notice_hours: preferences.minimumBookingNoticeHours || 2,
          accepts_emergency_bookings: preferences.acceptsEmergencyBookings || false
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
        specialization: provider.specialization,
        hourlyRate: provider.hourly_rate,
        payoutMethod: provider.payout_method,
        businessId: provider.business_id
      },
      message: 'Provider created successfully'
    });

  } catch (error: any) {
    console.error('Provider creation error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: 'Failed to create provider'
      },
      { status: 500 }
    );
  }
}
