import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';

export async function GET() {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }

    // Check user role - only allow owners and admins
    const userRole = user.user_metadata?.role || 'owner';
    if (userRole === 'customer') {
      return createForbiddenResponse('Customers cannot access admin endpoints');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the user's business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    
    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }
    
    const businessId = business.id;
    
    // Get bookings directly (no auth check for testing)
    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('business_id', businessId);
    
    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }
    
    // Get customers directly
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId);
    
    if (customerError) {
      return NextResponse.json({ error: customerError.message }, { status: 500 });
    }
    
    // Calculate stats
    const totalBookings = bookings?.length || 0;
    const activeCustomers = customers?.length || 0;
    const completedBookings = bookings?.filter(b => b.status === 'completed') || [];
    const totalRevenue = completedBookings.reduce((sum, booking) => sum + (booking.total_price || 0), 0);
    const completionRate = totalBookings > 0 ? ((completedBookings.length / totalBookings) * 100).toFixed(1) : '0.0';
    
    // Create stats object
    const stats = {
      totalRevenue: {
        value: `$${totalRevenue.toFixed(2)}`,
        change: '+0.0%',
        icon: 'DollarSign',
        trend: 'up',
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/20'
      },
      totalBookings: {
        value: totalBookings.toString(),
        change: '+0.0%',
        icon: 'Calendar',
        trend: 'up',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/20'
      },
      activeCustomers: {
        value: activeCustomers.toString(),
        change: '+0.0%',
        icon: 'Users',
        trend: 'up',
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-100 dark:bg-cyan-900/20'
      },
      completionRate: {
        value: `${completionRate}%`,
        change: '+0.0%',
        icon: 'TrendingUp',
        trend: 'up',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100 dark:bg-orange-900/20'
      }
    };
    
    // Transform bookings
    const transformedBookings = bookings?.map(booking => ({
      id: booking.id,
      customer: {
        name: booking.customer_name || 'Unknown Customer',
        email: booking.customer_email || '',
        phone: booking.customer_phone || ''
      },
      service: booking.service || 'General Service',
      date: booking.scheduled_date || booking.created_at?.split('T')[0] || '',
      time: booking.scheduled_time ? 
        booking.scheduled_time.toString().slice(0, 5) + ' ' + 
        (parseInt(booking.scheduled_time.toString().slice(0, 2)) >= 12 ? 'PM' : 'AM') : 
        '12:00 PM',
      status: booking.status || 'pending',
      amount: `$${(booking.total_price || 0).toFixed(2)}`,
      paymentMethod: booking.payment_method,
      notes: booking.notes
    })) || [];
    
    return NextResponse.json({
      success: true,
      data: {
        stats,
        bookings: transformedBookings,
        business_id: businessId
      }
    });

  } catch (error) {
    console.error('Simple dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
