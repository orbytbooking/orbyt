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

    // Get current date and previous month for comparisons (using UTC for consistency)
    const now = new Date();
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const currentMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    
    // Get all bookings for metrics calculation
    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    // Get customers
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId);
    
    if (customerError) {
      return NextResponse.json({ error: customerError.message }, { status: 500 });
    }

    // Calculate current month metrics (using UTC dates)
    const currentMonthBookings = bookings.filter(b => {
      const bookingDate = new Date(b.created_at);
      return bookingDate >= currentMonthStart && bookingDate <= currentMonthEnd;
    });

    const previousMonthBookings = bookings.filter(b => {
      const bookingDate = new Date(b.created_at);
      return bookingDate >= previousMonthStart && bookingDate < currentMonthStart;
    });

    // Current month stats
    const currentMonthRevenue = currentMonthBookings
      .filter(b => b.status === 'completed' || b.status === 'confirmed')
      .reduce((sum, booking) => sum + (booking.total_price || 0), 0);
    
    const currentMonthBookingsCount = currentMonthBookings.length;
    const currentMonthCompleted = currentMonthBookings.filter(b => b.status === 'completed').length;
    const currentMonthCompletionRate = currentMonthBookingsCount > 0 
      ? (currentMonthCompleted / currentMonthBookingsCount) * 100 
      : 0;

    // Previous month stats for comparison
    const previousMonthRevenue = previousMonthBookings
      .filter(b => b.status === 'completed' || b.status === 'confirmed')
      .reduce((sum, booking) => sum + (booking.total_price || 0), 0);
    
    const previousMonthBookingsCount = previousMonthBookings.length;
    const previousMonthCustomers = new Set(previousMonthBookings.map(b => b.customer_id)).size;

    // Calculate percentage changes
    const revenueChange = previousMonthRevenue > 0 
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue * 100).toFixed(1)
      : '0.0';
    
    const bookingsChange = previousMonthBookingsCount > 0
      ? ((currentMonthBookingsCount - previousMonthBookingsCount) / previousMonthBookingsCount * 100).toFixed(1)
      : '0.0';
    
    // Count unique customers from current month only
    const activeCustomers = new Set(currentMonthBookings.map(b => b.customer_id)).size;
    const customersChange = previousMonthCustomers > 0
      ? ((activeCustomers - previousMonthCustomers) / previousMonthCustomers * 100).toFixed(1)
      : '0.0';

    const completionRateChange = '0.0'; // Would need historical data for accurate comparison

    // Convert string changes to numbers for comparison
    const revenueChangeNum = parseFloat(revenueChange);
    const bookingsChangeNum = parseFloat(bookingsChange);
    const customersChangeNum = parseFloat(customersChange);
    const completionRateChangeNum = parseFloat(completionRateChange);

    // Create stats object with real data
    const stats = {
      totalRevenue: {
        value: `$${currentMonthRevenue.toFixed(2)}`,
        change: `${revenueChangeNum >= 0 ? '+' : ''}${revenueChange}%`,
        icon: 'DollarSign',
        trend: revenueChangeNum >= 0 ? 'up' : 'down',
        color: revenueChangeNum >= 0 ? 'text-green-600' : 'text-red-600',
        bgColor: revenueChangeNum >= 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
      },
      totalBookings: {
        value: currentMonthBookingsCount.toString(),
        change: `${bookingsChangeNum >= 0 ? '+' : ''}${bookingsChange}%`,
        icon: 'Calendar',
        trend: bookingsChangeNum >= 0 ? 'up' : 'down',
        color: bookingsChangeNum >= 0 ? 'text-blue-600' : 'text-red-600',
        bgColor: bookingsChangeNum >= 0 ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-red-100 dark:bg-red-900/20'
      },
      activeCustomers: {
        value: activeCustomers.toString(),
        change: `${customersChangeNum >= 0 ? '+' : ''}${customersChange}%`,
        icon: 'Users',
        trend: customersChangeNum >= 0 ? 'up' : 'down',
        color: customersChangeNum >= 0 ? 'text-cyan-600' : 'text-red-600',
        bgColor: customersChangeNum >= 0 ? 'bg-cyan-100 dark:bg-cyan-900/20' : 'bg-red-100 dark:bg-red-900/20'
      },
      completionRate: {
        value: `${currentMonthCompletionRate.toFixed(1)}%`,
        change: `${completionRateChangeNum >= 0 ? '+' : ''}${completionRateChange}%`,
        icon: 'TrendingUp',
        trend: completionRateChangeNum >= 0 ? 'up' : 'down',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100 dark:bg-orange-900/20'
      }
    };

    // Get upcoming bookings (future bookings) - using UTC for consistent date comparison
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const upcomingBookings = bookings
      .filter(booking => {
        const scheduledDate = booking.scheduled_date || booking.date;
        if (!scheduledDate) return false;
        const bookingDate = new Date(scheduledDate);
        return bookingDate >= today;
      })
      .sort((a, b) => {
        const dateA = new Date(a.scheduled_date || a.date);
        const dateB = new Date(b.scheduled_date || b.date);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 10); // Limit to next 10 bookings

    // Get recent bookings (latest created)
    const recentBookings = bookings
      .slice(0, 10) // Already ordered by created_at desc
      .map(booking => ({
        id: booking.id,
        customer: {
          name: booking.customer_name || 'Unknown Customer',
          email: booking.customer_email || '',
          phone: booking.customer_phone || ''
        },
        service: booking.service || 'General Service',
        date: booking.scheduled_date || booking.date || booking.created_at?.split('T')[0] || '',
        time: booking.scheduled_time ? 
          booking.scheduled_time.toString().slice(0, 5) + ' ' + 
          (parseInt(booking.scheduled_time.toString().slice(0, 2)) >= 12 ? 'PM' : 'AM') : 
          '12:00 PM',
        status: booking.status || 'pending',
        amount: `$${(booking.total_price || 0).toFixed(2)}`,
        paymentMethod: booking.payment_method,
        notes: booking.notes
      }));

    return NextResponse.json({
      success: true,
      data: {
        stats,
        upcomingBookings,
        recentBookings,
        business_id: businessId
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
