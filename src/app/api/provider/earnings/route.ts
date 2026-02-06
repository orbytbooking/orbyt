import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('=== PROVIDER EARNINGS API ===');
    
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

    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user session with token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get provider data
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('service_providers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (providerError || !provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Get completed bookings (these represent earnings)
    const { data: completedBookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        customers(name, email)
      `)
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id) // CRITICAL: Filter by business ID
      .eq('status', 'completed')
      .order('updated_at', { ascending: false });

    if (bookingsError) {
      console.error('Error fetching earnings:', bookingsError);
      return NextResponse.json(
        { error: 'Failed to fetch earnings' },
        { status: 500 }
      );
    }

    // Get pending bookings
    const { data: pendingBookings, error: pendingError } = await supabaseAdmin
      .from('bookings')
      .select('total_price')
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id) // CRITICAL: Filter by business ID
      .in('status', ['confirmed', 'scheduled']);

    if (pendingError) {
      console.error('Error fetching pending bookings:', pendingError);
    }

    // Transform earnings data
    const earningsHistory = completedBookings?.map(booking => ({
      id: `PAY${booking.id?.toString().slice(0, 8) || Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      date: booking.updated_at || booking.created_at,
      customer: booking.customers?.name || booking.customer_name || 'Unknown',
      service: booking.service || 'Service',
      amount: `$${booking.total_price || 0}`,
      status: 'paid',
      paymentMethod: 'Bank Transfer' // Default payment method
    })) || [];

    // Calculate stats
    const totalEarnings = completedBookings?.reduce((sum: number, booking: any) => sum + (booking.total_price || 0), 0) || 0;
    const pendingPayout = pendingBookings?.reduce((sum: number, booking: any) => sum + (booking.total_price || 0), 0) || 0;
    const completedJobs = completedBookings?.length || 0;
    const averagePerJob = completedJobs > 0 ? totalEarnings / completedJobs : 0;

    // Calculate monthly breakdown
    const monthlyData = completedBookings?.reduce((acc: any, booking) => {
      const date = new Date(booking.updated_at || booking.created_at);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      
      if (!acc[monthKey]) {
        acc[monthKey] = { earnings: 0, jobs: 0 };
      }
      
      acc[monthKey].earnings += booking.total_price || 0;
      acc[monthKey].jobs += 1;
      
      return acc;
    }, {}) || {};

    const monthlyBreakdown = Object.entries(monthlyData)
      .slice(-6) // Last 6 months
      .reverse()
      .map(([month, data]: [string, any]) => ({
        month,
        earnings: `$${data.earnings.toFixed(2)}`,
        jobs: data.jobs
      }));

    // This month's earnings
    const thisMonth = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    const thisMonthEarnings = monthlyData[thisMonth]?.earnings || 0;

    return NextResponse.json({
      earningsHistory,
      stats: {
        totalEarnings: `$${totalEarnings.toFixed(2)}`,
        thisMonth: `$${thisMonthEarnings.toFixed(2)}`,
        pendingPayout: `$${pendingPayout.toFixed(2)}`,
        averagePerJob: `$${averagePerJob.toFixed(0)}`,
        completedJobs
      },
      monthlyBreakdown
    });

  } catch (error) {
    console.error('Earnings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
