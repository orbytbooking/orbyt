import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    console.log('=== PROVIDER DASHBOARD API ===');
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get provider data
    const { data: provider, error } = await supabase
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

    // Get dashboard stats
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('provider_id', provider.id);

    const { data: earnings } = await supabase
      .from('earnings')
      .select('*')
      .eq('provider_id', provider.id);

    // Calculate stats
    const totalBookings = bookings?.length || 0;
    const totalEarnings = earnings?.reduce((sum: number, earning: any) => sum + (earning.amount || 0), 0) || 0;
    const completedBookings = bookings?.filter((b: any) => b.status === 'completed').length || 0;
    const upcomingBookings = bookings?.filter((b: any) => b.status === 'scheduled').length || 0;

    return NextResponse.json({
      provider,
      stats: {
        totalBookings,
        totalEarnings,
        completedBookings,
        upcomingBookings
      }
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}