import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';

export async function GET(request: Request) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const status = searchParams.get('status') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Debug logging
    console.log('Reports API called with params:', {
      query,
      status,
      startDate,
      endDate
    });

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

    // Build base query
    let bookingsQuery = supabase
      .from('bookings')
      .select('*')
      .eq('business_id', businessId);

    // Apply filters
    if (status !== 'all') {
      bookingsQuery = bookingsQuery.eq('status', status);
    }

    // Apply date filters - use scheduled_date as primary filter
    if (startDate) {
      bookingsQuery = bookingsQuery.gte('date', startDate);
    }

    if (endDate) {
      bookingsQuery = bookingsQuery.lte('date', endDate);
    }

    // Order by scheduled date for consistent results
    bookingsQuery = bookingsQuery.order('date', { ascending: false });

    const { data: bookings, error: bookingError } = await bookingsQuery;
    
    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    console.log('Raw bookings from DB:', bookings?.length || 0, 'bookings');

    // Filter by search query and apply additional client-side date filtering for precision
    let filteredBookings = bookings || [];
    if (query) {
      const lowerQuery = query.toLowerCase();
      filteredBookings = filteredBookings.filter(booking => 
        booking.id?.toLowerCase().includes(lowerQuery) ||
        booking.service?.toLowerCase().includes(lowerQuery) ||
        booking.customer_name?.toLowerCase().includes(lowerQuery) ||
        booking.customer_email?.toLowerCase().includes(lowerQuery)
      );
    }

    // Additional client-side date filtering to ensure accuracy
    if (startDate || endDate) {
      console.log('Applying date filter:', { startDate, endDate });
      const beforeFilter = filteredBookings.length;
      
      filteredBookings = filteredBookings.filter(booking => {
        const bookingDate = booking.date || booking.scheduled_date || booking.created_at?.split('T')[0] || '';
        const bookingDateObj = new Date(bookingDate);
        const startDateObj = startDate ? new Date(startDate) : new Date('1900-01-01');
        const endDateObj = endDate ? new Date(endDate) : new Date('2100-12-31');
        
        // Set time to midnight for accurate date comparison
        startDateObj.setHours(0, 0, 0, 0);
        endDateObj.setHours(23, 59, 59, 999);
        bookingDateObj.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
        
        const isInRange = bookingDateObj >= startDateObj && bookingDateObj <= endDateObj;
        if (!isInRange && (startDate || endDate)) {
          console.log('Booking filtered out:', {
            bookingDate,
            bookingDateObj: bookingDateObj.toISOString(),
            startDateObj: startDateObj.toISOString(),
            endDateObj: endDateObj.toISOString(),
            isInRange
          });
        }
        return isInRange;
      });
      
      console.log('Date filter results:', beforeFilter, '->', filteredBookings.length);
    }

    // Transform bookings data for frontend
    const transformedBookings = filteredBookings.map(booking => ({
      id: booking.id,
      date: booking.scheduled_date || booking.date || booking.created_at?.split('T')[0] || '',
      scheduled_date: booking.scheduled_date || booking.date || booking.created_at?.split('T')[0] || '',
      service: booking.service || 'General Service',
      status: booking.status || 'pending',
      amount: booking.total_price || 0,
      customer_name: booking.customer_name || '',
      customer_email: booking.customer_email || '',
      customer_phone: booking.customer_phone || '',
      payment_method: booking.payment_method,
      payment_status: booking.payment_status,
      notes: booking.notes,
      created_at: booking.created_at
    }));

    // Calculate summary statistics
    const totalBookings = transformedBookings.length;
    const completedBookings = transformedBookings.filter(b => b.status === 'completed');
    const cancelledBookings = transformedBookings.filter(b => b.status === 'cancelled');
    const confirmedBookings = transformedBookings.filter(b => b.status === 'confirmed');
    const pendingBookings = transformedBookings.filter(b => b.status === 'pending');

    const completed = completedBookings.length;
    const cancelled = cancelledBookings.length;
    
    // Calculate revenue from completed and confirmed bookings
    const revenue = [...completedBookings, ...confirmedBookings].reduce((sum, booking) => sum + (booking.amount || 0), 0);

    // Calculate revenue over time (grouped by date)
    const revenueByDateMap = new Map<string, number>();
    [...completedBookings, ...confirmedBookings].forEach(booking => {
      const date = booking.date;
      if (date) {
        revenueByDateMap.set(date, (revenueByDateMap.get(date) || 0) + (booking.amount || 0));
      }
    });
    
    const revenueByDate = Array.from(revenueByDateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    // Calculate status breakdown
    const statusCounts = {
      pending: pendingBookings.length,
      confirmed: confirmedBookings.length,
      completed: completedBookings.length,
      cancelled: cancelledBookings.length
    };

    return NextResponse.json({
      success: true,
      data: {
        bookings: transformedBookings,
        summary: {
          totalBookings,
          revenue,
          completed,
          cancelled
        },
        charts: {
          revenueByDate,
          statusCounts
        }
      }
    });

  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
