import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('=== PROVIDER DASHBOARD API ===');
    
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
    console.log('=== PROVIDER DASHBOARD API DEBUG ===');
    console.log('Auth header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No auth header or invalid format');
      return NextResponse.json(
        { error: 'Unauthorized - No token' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted:', token ? 'Token present' : 'No token');
    
    // Verify user session with token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    console.log('Auth result:', { user: user ? 'User found' : 'No user', error: authError });
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get provider data
    const { data: provider, error } = await supabaseAdmin
      .from('service_providers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching provider:', error);
      return NextResponse.json(
        { error: 'Failed to fetch provider data' },
        { status: 500 }
      );
    }

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Get provider's bookings with customer details
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        customer_name,
        customer_email,
        customer_phone,
        service,
        date,
        time,
        status,
        total_price,
        address,
        apt_no,
        zip_code,
        created_at
      `)
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id) // CRITICAL: Filter by business ID
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
    }

    // Get provider's earnings from provider_earnings table
    const { data: earnings, error: earningsError } = await supabaseAdmin
      .from('provider_earnings')
      .select('gross_amount, net_amount, status, created_at, booking_id')
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id); // CRITICAL: Filter by business ID

    if (earningsError) {
      console.error('Error fetching earnings:', earningsError);
    }

    // Get provider's performance metrics
    const { data: performance, error: performanceError } = await supabaseAdmin
      .from('provider_performance')
      .select('*')
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id) // CRITICAL: Filter by business ID
      .eq('period_type', 'monthly')
      .order('period_start', { ascending: false })
      .limit(1);

    if (performanceError) {
      console.error('Error fetching performance:', performanceError);
    }

    // Calculate statistics
    const completedJobs = bookings?.filter(booking => booking.status === 'completed').length || 0;
    const totalEarnings = earnings?.reduce((sum: number, earning: any) => sum + (earning.net_amount || 0), 0) || 0;
    const upcomingBookingsCount = bookings?.filter(booking => 
      booking.status === 'confirmed' || booking.status === 'pending'
    ).length || 0;
    const averageRating = performance?.[0]?.average_rating || provider.rating || 0;

    // Format upcoming bookings
    const upcomingBookings = bookings?.filter(booking => 
      booking.status === 'confirmed' || booking.status === 'pending'
    ).slice(0, 5).map(booking => ({
      id: booking.id,
      customer: booking.customer_name || 'Unknown Customer',
      service: booking.service || 'Service',
      date: booking.date,
      time: booking.time,
      status: booking.status,
      amount: `$${booking.total_price || 0}`,
      location: `${booking.address || ''}${booking.apt_no ? `, ${booking.apt_no}` : ''}${booking.zip_code ? `, ${booking.zip_code}` : ''}`
    })) || [];

    // Create recent activity from earnings and bookings
    const recentActivity = [];
    
    // Add recent completed bookings
    const recentCompleted = bookings?.filter(booking => booking.status === 'completed')
      .slice(-3)
      .map(booking => ({
        id: `booking-${booking.id}`,
        type: "completed",
        message: `Completed job for ${booking.customer_name} - ${booking.service}`,
        time: "2 hours ago",
        amount: `$${booking.total_price || 0}`
      }));

    // Add recent earnings
    const recentEarnings = earnings?.filter(earning => earning.status === 'paid')
      .slice(-3)
      .map(earning => ({
        id: `earning-${earning.created_at}`,
        type: "payment",
        message: "Payment received for completed services",
        time: "5 hours ago",
        amount: `$${earning.net_amount || 0}`
      }));

    recentActivity.push(...(recentCompleted || []), ...(recentEarnings || []));

    // Sort by time (most recent first) and limit to 5
    const sortedActivity = recentActivity
      .sort(() => Math.random() - 0.5) // Random sort for demo
      .slice(0, 5);

    const dashboardData = {
      provider: {
        id: provider.id,
        name: `${provider.first_name} ${provider.last_name}`,
        email: provider.email,
        rating: provider.rating || 0
      },
      stats: [
        {
          title: "Total Earnings",
          value: `$${totalEarnings.toFixed(2)}`,
          change: "+15.2%",
          icon: "DollarSign",
          color: "text-green-600",
          bgColor: "bg-green-100 dark:bg-green-900/20"
        },
        {
          title: "Completed Jobs",
          value: completedJobs.toString(),
          change: "+12.5%",
          icon: "CheckCircle2",
          color: "text-blue-600",
          bgColor: "bg-blue-100 dark:bg-blue-900/20"
        },
        {
          title: "Upcoming Bookings",
          value: upcomingBookingsCount.toString(),
          change: "+3",
          icon: "Calendar",
          color: "text-cyan-600",
          bgColor: "bg-cyan-100 dark:bg-cyan-900/20"
        },
        {
          title: "Average Rating",
          value: averageRating.toFixed(1),
          change: "+0.2",
          icon: "Star",
          color: "text-orange-600",
          bgColor: "bg-orange-100 dark:bg-orange-900/20"
        }
      ],
      upcomingBookings,
      recentActivity: sortedActivity
    };

    console.log('✅ Dashboard data fetched successfully');

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}