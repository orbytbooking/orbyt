import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== GET AVAILABLE PROVIDERS API ===');
    
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const serviceId = searchParams.get('serviceId');
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    
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

    // Get available providers for this business
    let query = supabaseAdmin
      .from('service_providers')
      .select(`
        *,
        provider_services(
          service_id,
          skill_level,
          is_primary_service
        ),
        provider_pay_rates(
          service_id,
          rate_type,
          flat_rate,
          percentage_rate,
          hourly_rate,
          is_active
        ),
        provider_capacity(
          max_concurrent_bookings,
          max_daily_bookings,
          current_workload
        ),
        provider_preferences(
          auto_assignments,
          advance_booking_days,
          minimum_booking_notice_hours
        ),
        provider_availability(
          day_of_week,
          start_time,
          end_time,
          is_available
        )
      `)
      .eq('business_id', businessId)
      .eq('status', 'active')
      .eq('availability_status', 'available');

    // Filter by service if specified
    if (serviceId) {
      query = query.contains('provider_services', JSON.stringify([{ service_id: serviceId }]));
    }

    const { data: providers, error } = await query;

    if (error) {
      console.error('Error fetching available providers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch providers' },
        { status: 500 }
      );
    }

    // Filter and score providers based on availability and capacity
    const availableProviders = providers?.map(provider => {
      let isAvailable = true;
      let availabilityScore = 100;
      const reasons = [];

      // Check if provider accepts auto-assignments
      if (!provider.provider_preferences?.[0]?.auto_assignments) {
        isAvailable = false;
        reasons.push('Does not accept auto-assignments');
      }

      // Check capacity
      const capacity = provider.provider_capacity?.[0];
      if (capacity && capacity.current_workload >= 100) {
        isAvailable = false;
        reasons.push('At full capacity');
      } else if (capacity) {
        availabilityScore -= capacity.current_workload;
        reasons.push(`Current workload: ${capacity.current_workload}%`);
      }

      // Check service match
      if (serviceId) {
        const serviceMatch = provider.provider_services?.find(
          ps => ps.service_id === serviceId
        );
        if (!serviceMatch) {
          isAvailable = false;
          reasons.push('Does not provide this service');
        } else {
          availabilityScore += 20; // Bonus for service match
          if (serviceMatch.is_primary_service) {
            availabilityScore += 10;
            reasons.push('Primary service provider');
          }
        }
      }

      // Check availability for specific date/time
      if (date && time) {
        const bookingDate = new Date(date);
        const dayOfWeek = bookingDate.getDay();
        
        const availability = provider.provider_availability?.find(
          pa => pa.day_of_week === dayOfWeek && pa.is_available
        );
        
        if (!availability) {
          isAvailable = false;
          reasons.push('Not available on requested day/time');
        } else {
          availabilityScore += 15;
          reasons.push('Available on requested date');
        }
      }

      return {
        id: provider.id,
        name: `${provider.first_name} ${provider.last_name}`,
        email: provider.email,
        phone: provider.phone,
        specialization: provider.specialization,
        rating: provider.rating || 0,
        completedJobs: provider.completed_jobs || 0,
        isAvailable,
        availabilityScore,
        reasons,
        services: provider.provider_services || [],
        payRates: provider.provider_pay_rates || [],
        capacity: provider.provider_capacity?.[0] || null,
        preferences: provider.provider_preferences?.[0] || null
      };
    }) || [];

    // Sort by availability score (highest first)
    availableProviders.sort((a, b) => b.availabilityScore - a.availabilityScore);

    return NextResponse.json({
      success: true,
      providers: availableProviders,
      count: availableProviders.length
    });

  } catch (error: any) {
    console.error('Available providers API error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: 'Failed to fetch available providers'
      },
      { status: 500 }
    );
  }
}
