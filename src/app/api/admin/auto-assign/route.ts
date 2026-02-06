import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== AUTO-ASSIGN BOOKING API ===');
    
    const body = await request.json();
    const { bookingId, businessId } = body;

    if (!bookingId || !businessId) {
      return NextResponse.json(
        { error: 'Booking ID and Business ID are required' },
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

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('business_id', businessId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get available providers for this service
    const { data: providers, error: providersError } = await supabaseAdmin
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
        provider_service_areas(
          area_name,
          city,
          state,
          latitude,
          longitude,
          radius_km
        ),
        provider_capacity(
          max_concurrent_bookings,
          max_daily_bookings,
          current_workload
        ),
        provider_preferences(
          auto_assignments,
          advance_booking_days,
          minimum_booking_notice_hours,
          accepts_emergency_bookings
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

    if (providersError) {
      console.error('Error fetching providers:', providersError);
      return NextResponse.json(
        { error: 'Failed to fetch providers' },
        { status: 500 }
      );
    }

    // Filter and score providers
    const scoredProviders = providers
      .filter(provider => {
        // Check if provider accepts auto-assignments
        if (!provider.provider_preferences?.[0]?.auto_assignments) {
          return false;
        }

        // Check if provider can do this service
        const canDoService = provider.provider_services?.some(
          ps => ps.service_id === booking.service_id
        );
        if (!canDoService) {
          return false;
        }

        // Check capacity
        const capacity = provider.provider_capacity?.[0];
        if (capacity && capacity.current_workload >= 100) {
          return false;
        }

        return true;
      })
      .map(provider => {
        let score = 0;
        const reasons = [];

        // 1. Service match (30 points)
        const serviceMatch = provider.provider_services?.find(
          ps => ps.service_id === booking.service_id
        );
        if (serviceMatch) {
          score += 30;
          if (serviceMatch.is_primary_service) {
            score += 10; // Bonus for primary service
            reasons.push('Primary service match');
          }
          if (serviceMatch.skill_level === 'expert') score += 5;
          else if (serviceMatch.skill_level === 'advanced') score += 3;
          else if (serviceMatch.skill_level === 'intermediate') score += 1;
          reasons.push('Service skill level: ' + serviceMatch.skill_level);
        }

        // 2. Availability (25 points)
        const bookingDate = new Date(booking.scheduled_date);
        const dayOfWeek = bookingDate.getDay();
        const bookingTime = booking.scheduled_time;

        const availability = provider.provider_availability?.find(
          pa => pa.day_of_week === dayOfWeek && pa.is_available
        );
        if (availability) {
          score += 25;
          reasons.push('Available on requested day/time');
        }

        // 3. Workload (20 points)
        const capacity = provider.provider_capacity?.[0];
        if (capacity) {
          const workloadScore = Math.max(0, 20 - (capacity.current_workload || 0));
          score += workloadScore;
          reasons.push(`Current workload: ${capacity.current_workload}%`);
        }

        // 4. Location proximity (15 points)
        // This would require geolocation calculation - simplified for now
        const serviceAreas = provider.provider_service_areas || [];
        if (serviceAreas.length > 0) {
          score += 15;
          reasons.push('Service area coverage');
        }

        // 5. Performance rating (10 points)
        const rating = provider.rating || 0;
        score += Math.min(rating * 2, 10);
        reasons.push(`Rating: ${rating}`);

        return {
          provider,
          score,
          reasons
        };
      })
      .sort((a, b) => b.score - a.score);

    if (scoredProviders.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No available providers found for this booking',
        reasons: ['No providers match the required service, availability, or capacity requirements']
      });
    }

    // Select the best provider
    const bestMatch = scoredProviders[0];

    // Create assignment record
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('booking_assignments')
      .insert({
        booking_id: bookingId,
        provider_id: bestMatch.provider.id,
        assignment_type: 'auto',
        status: 'assigned',
        auto_assignment_score: bestMatch.score
      })
      .select()
      .single();

    if (assignmentError) {
      console.error('Error creating assignment:', assignmentError);
      return NextResponse.json(
        { error: 'Failed to create assignment' },
        { status: 500 }
      );
    }

    // Update booking with provider
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ 
        provider_id: bestMatch.provider.id,
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to update booking' },
        { status: 500 }
      );
    }

    // Log the assignment
    await supabaseAdmin
      .from('assignment_logs')
      .insert({
        booking_id: bookingId,
        provider_id: bestMatch.provider.id,
        action: 'assigned',
        assignment_score: bestMatch.score,
        rule_applied: 'auto-assignment algorithm',
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id,
        bookingId: bookingId,
        providerId: bestMatch.provider.id,
        providerName: `${bestMatch.provider.first_name} ${bestMatch.provider.last_name}`,
        assignmentType: 'auto',
        score: bestMatch.score,
        reasons: bestMatch.reasons
      },
      message: `Booking automatically assigned to ${bestMatch.provider.first_name} ${bestMatch.provider.last_name}`
    });

  } catch (error: any) {
    console.error('Auto-assignment error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: 'Failed to auto-assign booking'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== GET ASSIGNMENT RULES API ===');
    
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
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get recent assignments with scores
    const { data: assignments, error } = await supabaseAdmin
      .from('booking_assignments')
      .select(`
        *,
        service_providers(first_name, last_name, email),
        bookings(scheduled_date, scheduled_time, total_price, service)
      `)
      .eq('assignment_type', 'auto')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching assignments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = {
      totalAutoAssignments: assignments?.length || 0,
      averageScore: assignments?.length > 0 
        ? assignments.reduce((sum, a) => sum + (a.auto_assignment_score || 0), 0) / assignments.length 
        : 0,
      recentAssignments: assignments?.map(a => ({
        id: a.id,
        bookingId: a.booking_id,
        providerName: a.service_providers 
          ? `${a.service_providers.first_name} ${a.service_providers.last_name}`
          : 'Unknown',
        service: a.bookings?.service || 'Unknown',
        score: a.auto_assignment_score,
        assignedAt: a.created_at
      })) || []
    };

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('Assignment rules API error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: 'Failed to fetch assignment rules'
      },
      { status: 500 }
    );
  }
}
