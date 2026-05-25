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

    // Get provider earnings (actual pay per booking from provider_earnings table)
    const { data: earningsRowsRaw, error: earningsError } = await supabaseAdmin
      .from('provider_earnings')
      .select(`
        id,
        booking_id,
        gross_amount,
        net_amount,
        status,
        created_at,
        bookings(
          id,
          customer_name,
          customer_email,
          service,
          status,
          business_id
        )
      `)
      .eq('provider_id', provider.id)
      .order('created_at', { ascending: false });

    // Filter to this business only (bookings.business_id)
    const earningsRows = Array.isArray(earningsRowsRaw)
      ? earningsRowsRaw.filter((row: any) => row.bookings?.business_id === provider.business_id)
      : [];

    if (earningsError) {
      console.error('Error fetching provider_earnings:', earningsError);
      // Fallback: use completed bookings if provider_earnings is empty or table doesn't exist
      const { data: completedBookings, error: bookingsError } = await supabaseAdmin
        .from('bookings')
        .select(`*, customers(name, email)`)
        .eq('provider_id', provider.id)
        .eq('business_id', provider.business_id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (bookingsError) {
        return NextResponse.json(
          { error: 'Failed to fetch earnings' },
          { status: 500 }
        );
      }

      const earningsHistory = completedBookings?.map((booking: any) => ({
        id: `PAY${booking.id?.toString().slice(0, 8) || ''}`,
        date: booking.updated_at || booking.created_at,
        customer: booking.customers?.name || booking.customer_name || 'Unknown',
        service: booking.service || 'Service',
        amount: `$${Number(booking.total_price || 0).toFixed(2)}`,
        status: 'paid',
        paymentMethod: 'Bank Transfer'
      })) || [];
      const totalEarnings = completedBookings?.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0) || 0;
      const completedJobs = completedBookings?.length || 0;
      const averagePerJob = completedJobs > 0 ? totalEarnings / completedJobs : 0;
      const monthlyData: Record<string, { earnings: number; jobs: number }> = {};
      completedBookings?.forEach((booking: any) => {
        const date = new Date(booking.updated_at || booking.created_at);
        const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { earnings: 0, jobs: 0 };
        monthlyData[monthKey].earnings += booking.total_price || 0;
        monthlyData[monthKey].jobs += 1;
      });
      const thisMonth = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      const thisMonthEarnings = monthlyData[thisMonth]?.earnings || 0;
      const monthlyBreakdown = Object.entries(monthlyData)
        .slice(-6)
        .reverse()
        .map(([month, data]) => ({ month, earnings: `$${data.earnings.toFixed(2)}`, jobs: data.jobs }));

      return NextResponse.json({
        earningsHistory,
        stats: {
          totalEarnings: `$${totalEarnings.toFixed(2)}`,
          thisMonth: `$${thisMonthEarnings.toFixed(2)}`,
          pendingPayout: '$0.00',
          averagePerJob: `$${averagePerJob.toFixed(0)}`,
          completedJobs
        },
        monthlyBreakdown
      });
    }

    // Build earnings history from provider_earnings (uses net_amount = actual provider pay)
    const earningsList = Array.isArray(earningsRows) ? earningsRows : [];
    const earningsHistory = earningsList.map((row: any) => {
      const booking = row.bookings || {};
      const netAmount = Number(row.net_amount ?? 0);
      const grossAmount = Number(row.gross_amount ?? 0);
      const payRateType = row.pay_rate_type || 'percentage';
      let wageUsed = '';
      if (payRateType === 'percentage' && grossAmount > 0) {
        const pct = ((netAmount / grossAmount) * 100).toFixed(1);
        wageUsed = `${pct}% of job total`;
      } else if (payRateType === 'fixed') {
        wageUsed = `$${netAmount.toFixed(2)} (fixed amount)`;
      } else if (payRateType === 'hourly') {
        wageUsed = `$${netAmount.toFixed(2)}/hr (1 hr)`;
      } else {
        wageUsed = grossAmount > 0 ? `${((netAmount / grossAmount) * 100).toFixed(1)}% of job total` : '—';
      }
      return {
        id: row.id?.toString().slice(0, 8) || `PAY${row.booking_id?.toString().slice(0, 8) || ''}`,
        bookingId: row.booking_id,
        date: row.created_at,
        customer: booking.customer_name || 'Unknown',
        service: booking.service || 'Service',
        amount: `$${netAmount.toFixed(2)}`,
        grossAmount: row.gross_amount != null ? `$${grossAmount.toFixed(2)}` : undefined,
        payRateType,
        wageUsed,
        status: (row.status || 'paid').toLowerCase(),
        paymentMethod: 'Bank Transfer'
      };
    });

    const totalEarnings = earningsList.reduce((sum: number, row: any) => sum + (row.net_amount ?? 0), 0);
    const completedJobs = earningsList.length;
    const averagePerJob = completedJobs > 0 ? totalEarnings / completedJobs : 0;

    const monthlyData: Record<string, { earnings: number; jobs: number }> = {};
    earningsList.forEach((row: any) => {
      const date = new Date(row.created_at);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { earnings: 0, jobs: 0 };
      monthlyData[monthKey].earnings += row.net_amount ?? 0;
      monthlyData[monthKey].jobs += 1;
    });

    const monthlyBreakdown = Object.entries(monthlyData)
      .slice(-6)
      .reverse()
      .map(([month, data]) => ({
        month,
        earnings: `$${data.earnings.toFixed(2)}`,
        jobs: data.jobs
      }));

    const thisMonth = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    const thisMonthEarnings = monthlyData[thisMonth]?.earnings || 0;

    // Pending payout: sum of completed bookings not yet in provider_earnings (optional)
    const { data: pendingBookings } = await supabaseAdmin
      .from('bookings')
      .select('total_price')
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id)
      .in('status', ['confirmed', 'in_progress']);
    const pendingPayout = pendingBookings?.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0) || 0;

    return NextResponse.json({
      earningsHistory,
      stats: {
        totalEarnings: `$${totalEarnings.toFixed(2)}`,
        thisMonth: `$${thisMonthEarnings.toFixed(2)}`,
        pendingPayout: `$${Number(pendingPayout).toFixed(2)}`,
        averagePerJob: `$${averagePerJob.toFixed(2)}`,
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
