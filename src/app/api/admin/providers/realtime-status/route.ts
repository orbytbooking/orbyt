import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRealTimeProviderAvailability, getProviderPerformanceMetrics } from '@/lib/adminProviderSync';

export async function GET(request: NextRequest) {
  try {
    console.log('=== ADMIN PROVIDER REALTIME STATUS API ===');
    
    // Create service role client for server-side operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get business ID from query params
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const providerId = searchParams.get('providerId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const time = searchParams.get('time') || new Date().toTimeString().split(' ')[0].substring(0, 5);

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    // Get real-time provider status
    const { data: providers, error: providersError } = await supabaseAdmin
      .from('service_providers')
      .select(`
        *,
        provider_services(
          services(name, id)
        ),
        provider_pay_rates(
          rate_type,
          flat_rate,
          percentage_rate,
          hourly_rate,
          is_active
        ),
        provider_earnings(
          net_amount,
          status,
          created_at
        )
      `)
      .eq('business_id', businessId)
      .eq('status', 'active');

    if (providersError) {
      console.error('Error fetching providers:', providersError);
      return NextResponse.json(
        { error: 'Failed to fetch providers' },
        { status: 500 }
      );
    }

    // Get current bookings for each provider
    const providerIds = providers.map(p => p.id);
    const { data: currentBookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        customers(name, email)
      `)
      .in('provider_id', providerIds)
      .in('status', ['confirmed', 'in_progress'])
      .eq('business_id', businessId)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (bookingsError) {
      console.error('Error fetching current bookings:', bookingsError);
    }

    // Transform provider data with real-time status
    const providersWithStatus = providers.map(provider => {
      const currentBooking = currentBookings?.find(b => b.provider_id === provider.id);
      const totalEarnings = provider.provider_earnings
        ?.filter(e => e.status === 'paid')
        ?.reduce((sum, e) => sum + (e.net_amount || 0), 0) || 0;
      
      const pendingEarnings = provider.provider_earnings
        ?.filter(e => e.status === 'pending')
        ?.reduce((sum, e) => sum + (e.net_amount || 0), 0) || 0;

      return {
        id: provider.id,
        name: `${provider.first_name} ${provider.last_name}`,
        email: provider.email,
        phone: provider.phone,
        specialization: provider.specialization,
        rating: provider.rating || 0,
        completed_jobs: provider.completed_jobs || 0,
        status: provider.availability_status,
        currentBooking: currentBooking ? {
          id: currentBooking.id,
          customer: currentBooking.customers?.name || currentBooking.customer_name,
          service: currentBooking.service,
          date: currentBooking.scheduled_date,
          time: currentBooking.scheduled_time,
          status: currentBooking.status
        } : null,
        earnings: {
          total: totalEarnings,
          pending: pendingEarnings
        },
        services: provider.provider_services?.map(ps => ps.services) || [],
        payRates: provider.provider_pay_rates?.filter(pr => pr.is_active) || [],
        lastActive: provider.updated_at
      };
    });

    // Get availability for specific date/time if requested
    let availability = [];
    if (date && time) {
      const availabilityResult = await getRealTimeProviderAvailability(businessId, date, time);
      if (availabilityResult.success) {
        availability = availabilityResult.data;
      }
    }

    return NextResponse.json({
      providers: providersWithStatus,
      availability,
      summary: {
        totalProviders: providers.length,
        activeProviders: providers.filter(p => p.availability_status === 'available').length,
        busyProviders: providers.filter(p => p.availability_status === 'busy').length,
        totalEarnings: providersWithStatus.reduce((sum, p) => sum + p.earnings.total, 0),
        pendingEarnings: providersWithStatus.reduce((sum, p) => sum + p.earnings.pending, 0)
      }
    });

  } catch (error) {
    console.error('Realtime status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== UPDATE PROVIDER STATUS API ===');
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { providerId, businessId, status, notes } = await request.json();

    if (!providerId || !businessId || !status) {
      return NextResponse.json(
        { error: 'Provider ID, business ID, and status are required' },
        { status: 400 }
      );
    }

    // Update provider status
    const { data: updatedProvider, error } = await supabaseAdmin
      .from('service_providers')
      .update({
        availability_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', providerId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) {
      console.error('Error updating provider status:', error);
      return NextResponse.json(
        { error: 'Failed to update provider status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      provider: updatedProvider
    });

  } catch (error) {
    console.error('Update provider status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
