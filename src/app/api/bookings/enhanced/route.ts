import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createAdminNotification } from '@/lib/adminProviderSync';
import { notifyProviderOfBooking } from '@/lib/notifyProviderBooking';

export async function POST(request: Request) {
  try {
    console.log('=== ENHANCED BOOKING API ===');
    
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

    // Parse request body
    const bookingData = await request.json();
    const { businessId, autoAssign = true } = bookingData;

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    let providerId = bookingData.providerId || null;
    let bookingStatus = bookingData.providerId ? 'confirmed' : 'pending';

    // Auto-assign provider if requested and no provider specified
    if (autoAssign && !providerId) {
      console.log('Auto-assigning provider...');
      
      try {
        // Get available providers for this service and time
        const { data: providers } = await supabaseAdmin
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
            )
          `)
          .eq('business_id', businessId)
          .eq('status', 'active')
          .eq('availability_status', 'available');

        if (providers && providers.length > 0) {
          // Score and select best provider
          const scoredProviders = providers
            .filter(provider => {
              // Check if provider accepts auto-assignments
              if (!provider.provider_preferences?.[0]?.auto_assignments) {
                return false;
              }

              // Check if provider can do this service
              const canDoService = provider.provider_services?.some(
                ps => ps.service_id === bookingData.serviceId
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

              // Service match
              const serviceMatch = provider.provider_services?.find(
                ps => ps.service_id === bookingData.serviceId
              );
              if (serviceMatch) {
                score += 30;
                if (serviceMatch.is_primary_service) score += 10;
                if (serviceMatch.skill_level === 'expert') score += 5;
                else if (serviceMatch.skill_level === 'advanced') score += 3;
                else if (serviceMatch.skill_level === 'intermediate') score += 1;
              }

              // Workload
              const capacity = provider.provider_capacity?.[0];
              if (capacity) {
                score += Math.max(0, 20 - (capacity.current_workload || 0));
              }

              // Rating
              score += Math.min((provider.rating || 0) * 2, 10);

              return { provider, score };
            })
            .sort((a, b) => b.score - a.score);

          if (scoredProviders.length > 0) {
            providerId = scoredProviders[0].provider.id;
            bookingStatus = 'confirmed';
            console.log(`Auto-assigned provider: ${scoredProviders[0].provider.first_name} ${scoredProviders[0].provider.last_name}`);
          }
        }
      } catch (error) {
        console.error('Auto-assignment failed:', error);
        // Continue without provider assignment
      }
    }

    // Create customer record if needed
    let customerId = bookingData.customerId;
    if (!customerId && bookingData.customer_email) {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .upsert({
          business_id: businessId,
          name: bookingData.customer_name,
          email: bookingData.customer_email,
          phone: bookingData.customer_phone,
          address: bookingData.address,
        })
        .select('id')
        .single();
      
      customerId = customer?.id;
    }

    // Create booking
    const bookingPayload = {
      business_id: businessId,
      customer_id: customerId,
      customer_name: bookingData.customer_name,
      customer_email: bookingData.customer_email,
      customer_phone: bookingData.customer_phone,
      service_id: bookingData.serviceId,
      service: bookingData.service,
      scheduled_date: bookingData.date,
      scheduled_time: bookingData.time,
      address: bookingData.address,
      notes: bookingData.notes,
      total_price: bookingData.amount || 0,
      payment_method: bookingData.payment_method || 'cash',
      provider_id: providerId,
      status: bookingStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert(bookingPayload)
      .select()
      .single();

    if (bookingError) {
      console.error('Booking creation error:', bookingError);
      return NextResponse.json(
        { error: `Failed to create booking: ${bookingError.message}` },
        { status: 500 }
      );
    }

    // Create assignment record if provider was assigned
    if (providerId) {
      await supabaseAdmin
        .from('booking_assignments')
        .insert({
          booking_id: booking.id,
          provider_id: providerId,
          assignment_type: autoAssign ? 'auto' : 'manual',
          status: 'assigned',
          assigned_at: new Date().toISOString()
        });

      // Update provider workload
      await supabaseAdmin
        .from('provider_capacity')
        .update({
          current_workload: supabaseAdmin.rpc('increment_workload', { 
            provider_id: providerId,
            increment: 10
          })
        })
        .eq('provider_id', providerId);
    }

    const bkRef = `BK${String(booking.id).slice(-6).toUpperCase()}`;
    const assignMsg = providerId ? ' and assigned to provider' : '';
    await createAdminNotification(businessId, providerId ? 'booking_assigned' : 'new_booking', {
      title: providerId ? 'Booking assigned' : 'New booking confirmed',
      message: `Booking ${bkRef} has been confirmed${assignMsg}.`,
      link: '/admin/bookings',
    });

    if (providerId) {
      try {
        await notifyProviderOfBooking(supabaseAdmin, { bookingId: booking.id });
      } catch (e) {
        console.warn('Provider booking email notification failed:', e);
      }
    }

    return NextResponse.json({
      success: true,
      data: booking,
      message: providerId 
        ? `Booking created and assigned to provider` 
        : `Booking created successfully (pending provider assignment)`,
      autoAssigned: autoAssign && !!providerId
    });

  } catch (error: any) {
    console.error('Enhanced booking API error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: 'Failed to create enhanced booking'
      },
      { status: 500 }
    );
  }
}
