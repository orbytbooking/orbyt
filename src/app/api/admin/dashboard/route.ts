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
    
    // Get all bookings - start with simple query to isolate issues
    let bookings;
    let bookingError;
    
    try {
      // Try simple query first
      const simpleResult = await supabase
        .from('bookings')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      
      bookings = simpleResult.data;
      bookingError = simpleResult.error;
      
      if (bookingError) {
        console.error('Dashboard API - Simple booking query error:', bookingError);
        return NextResponse.json({ error: bookingError.message }, { status: 500 });
      }
      
      console.log(`Dashboard API - Simple query successful, got ${bookings?.length || 0} bookings`);
      
    } catch (queryError) {
      console.error('Dashboard API - Query exception:', queryError);
      return NextResponse.json({ error: 'Query failed: ' + queryError.message }, { status: 500 });
    }

    // Ensure bookings is an array
    const safeBookings = Array.isArray(bookings) ? bookings : [];
    console.log(`Dashboard API - Found ${safeBookings.length} bookings for business ${businessId}`);
    
    // Debug: Check for any booking data issues
    const problematicBookings = safeBookings.filter(b => !b.id || !b.created_at);
    if (problematicBookings.length > 0) {
      console.warn(`Dashboard API - Found ${problematicBookings.length} bookings with missing required fields:`, problematicBookings);
    }

    // Get providers for business
    const { data: providers, error: providerError } = await supabase
      .from('service_providers')
      .select('*')
      .eq('business_id', businessId);
    
    if (providerError) {
      console.error('Provider fetch error:', providerError);
      // Continue without providers - we'll show "Unassigned" for bookings without providers
    }

    // Get booking assignments to link bookings with providers
    const { data: bookingAssignments, error: assignmentError } = await supabase
      .from('booking_assignments')
      .select('*')
      .eq('business_id', businessId);
    
    if (assignmentError) {
      console.error('Booking assignments fetch error:', assignmentError);
      // Continue without assignments - we'll show "Unassigned" for all bookings
    }

    // Get customers
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId);
    
    if (customerError) {
      return NextResponse.json({ error: customerError.message }, { status: 500 });
    }

    // Create helper maps for efficient lookups
    const providerMap = new Map();
    if (providers && Array.isArray(providers)) {
      providers.forEach(provider => {
        providerMap.set(provider.id, provider);
      });
    }

    const assignmentMap = new Map();
    if (bookingAssignments && Array.isArray(bookingAssignments)) {
      bookingAssignments.forEach(assignment => {
        assignmentMap.set(assignment.booking_id, assignment);
      });
    }

    const customerMap = new Map();
    if (customers && Array.isArray(customers)) {
      customers.forEach(customer => {
        customerMap.set(customer.id, customer);
      });
    }

    // Helper function to get provider for a booking (checks assignment first, then booking.provider_id)
    const getProviderForBooking = (booking) => {
      const assignment = assignmentMap.get(booking.id);
      if (assignment && assignment.provider_id) {
        return providerMap.get(assignment.provider_id);
      }
      if (booking.provider_id) {
        return providerMap.get(booking.provider_id);
      }
      return null;
    };

    // Helper function to get customer for a booking (for booking details dialog)
    const getCustomerForBooking = (bookingId) => {
      if (bookingId && customerMap.has(bookingId)) {
        return customerMap.get(bookingId);
      }
      return null;
    };

    // Calculate current month metrics (using UTC dates)
    const currentMonthBookings = safeBookings.filter(b => {
      const bookingDate = new Date(b.created_at);
      return bookingDate >= currentMonthStart && bookingDate <= currentMonthEnd;
    });

    const previousMonthBookings = safeBookings.filter(b => {
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
    const previousMonthCustomers = new Set(previousMonthBookings.map(b => b.customer_id).filter(Boolean)).size;

    // Calculate percentage changes with safe defaults
    const revenueChange = previousMonthRevenue > 0 
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue * 100).toFixed(1)
      : currentMonthRevenue > 0 ? '100.0' : '0.0';
    
    const bookingsChange = previousMonthBookingsCount > 0
      ? ((currentMonthBookingsCount - previousMonthBookingsCount) / previousMonthBookingsCount * 100).toFixed(1)
      : currentMonthBookingsCount > 0 ? '100.0' : '0.0';
    
    // Count unique customers from current month only
    const activeCustomers = new Set(currentMonthBookings.map(b => b.customer_id).filter(Boolean)).size;
    const customersChange = previousMonthCustomers > 0
      ? ((activeCustomers - previousMonthCustomers) / previousMonthCustomers * 100).toFixed(1)
      : activeCustomers > 0 ? '100.0' : '0.0';

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
    
    const upcomingBookings = safeBookings
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
      .slice(0, 10) // Limit to next 10 bookings
      .map(booking => {
        try {
          // Get provider for this booking
          const provider = getProviderForBooking(booking);
          const customer = getCustomerForBooking(booking.customer_id);
          
          // Use hybrid approach: customer_* fields from bookings table (no joins to avoid schema issues)
          let formattedTime = '12:00 PM';
          if (booking.scheduled_time) {
            try {
              const timeStr = typeof booking.scheduled_time === 'string' ? 
                booking.scheduled_time : 
                booking.scheduled_time.toString();
              const timePart = timeStr.slice(0, 5);
              const hourPart = parseInt(timePart.split(':')[0]) || 12;
              const period = hourPart >= 12 ? 'PM' : 'AM';
              formattedTime = `${timePart} ${period}`;
            } catch (timeError) {
              console.warn('Time formatting error for booking:', booking.id, timeError);
            }
          }
          
          return {
            id: booking.id || 'unknown',
            provider: provider ? {
              id: provider.id,
              name: `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || provider.name || 'Unknown Provider',
              email: provider.email || '',
              phone: provider.phone || ''
            } : null,
            customer: customer ? {
              name: customer.name || booking.customer_name || 'Unknown Customer',
              email: customer.email || booking.customer_email || '',
              phone: customer.phone || booking.customer_phone || ''
            } : {
              name: booking.customer_name || 'Unknown Customer',
              email: booking.customer_email || '',
              phone: booking.customer_phone || ''
            },
            service: booking.service || 'General Service',
            date: booking.scheduled_date || booking.date || booking.created_at?.split('T')[0] || '',
            time: formattedTime,
            status: booking.status || 'pending',
            amount: `$${(booking.total_price || 0).toFixed(2)}`,
            paymentMethod: booking.payment_method,
            notes: booking.notes || '',
            zipCode: booking.zip_code,
            frequency: booking.frequency,
            customization: booking.customization,
            durationMinutes: booking.duration_minutes != null ? Number(booking.duration_minutes) : null,
            providerWage: booking.provider_wage != null ? Number(booking.provider_wage) : null,
            aptNo: booking.apt_no,
            address: booking.address
          };
        } catch (bookingError) {
          console.error('Error processing booking:', booking.id, bookingError);
          return {
            id: booking.id || 'error-booking',
            provider: null,
            customer: {
              name: 'Error Loading Customer',
              email: '',
              phone: ''
            },
            service: 'Error Loading Service',
            date: '',
            time: '12:00 PM',
            status: 'error',
            amount: '$0.00',
            paymentMethod: '',
            notes: 'Error processing booking',
            zipCode: null,
            frequency: null,
            customization: null,
            durationMinutes: null,
            providerWage: null,
            aptNo: null,
            address: null
          };
        }
      });

    // Get recent bookings (latest created)
    const recentBookings = safeBookings
      .slice(0, 10) // Already ordered by created_at desc
      .map(booking => {
        try {
          // Get provider for this booking
          const provider = getProviderForBooking(booking);
          const customer = getCustomerForBooking(booking.customer_id);
          
          // Use hybrid approach: customer_* fields from bookings table (no joins to avoid schema issues)
          let formattedTime = '12:00 PM';
          if (booking.scheduled_time) {
            try {
              const timeStr = typeof booking.scheduled_time === 'string' ? 
                booking.scheduled_time : 
                booking.scheduled_time.toString();
              const timePart = timeStr.slice(0, 5);
              const hourPart = parseInt(timePart.split(':')[0]) || 12;
              const period = hourPart >= 12 ? 'PM' : 'AM';
              formattedTime = `${timePart} ${period}`;
            } catch (timeError) {
              console.warn('Time formatting error for booking:', booking.id, timeError);
            }
          }
          
          return {
            id: booking.id || 'unknown',
            provider: provider ? {
              id: provider.id,
              name: `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || provider.name || 'Unknown Provider',
              email: provider.email || '',
              phone: provider.phone || ''
            } : null,
            customer: customer ? {
              name: customer.name || booking.customer_name || 'Unknown Customer',
              email: customer.email || booking.customer_email || '',
              phone: customer.phone || booking.customer_phone || ''
            } : {
              name: booking.customer_name || 'Unknown Customer',
              email: booking.customer_email || '',
              phone: booking.customer_phone || ''
            },
            service: booking.service || 'General Service',
            date: booking.scheduled_date || booking.date || booking.created_at?.split('T')[0] || '',
            time: formattedTime,
            status: booking.status || 'pending',
            amount: `$${(booking.total_price || 0).toFixed(2)}`,
            paymentMethod: booking.payment_method,
            notes: booking.notes || '',
            zipCode: booking.zip_code,
            frequency: booking.frequency,
            customization: booking.customization,
            durationMinutes: booking.duration_minutes != null ? Number(booking.duration_minutes) : null,
            providerWage: booking.provider_wage != null ? Number(booking.provider_wage) : null,
            aptNo: booking.apt_no,
            address: booking.address
          };
        } catch (bookingError) {
          console.error('Error processing booking:', booking.id, bookingError);
          return {
            id: booking.id || 'error-booking',
            provider: null,
            customer: {
              name: 'Error Loading Customer',
              email: '',
              phone: ''
            },
            service: 'Error Loading Service',
            date: '',
            time: '12:00 PM',
            status: 'error',
            amount: '$0.00',
            paymentMethod: '',
            notes: 'Error processing booking',
            zipCode: null,
            frequency: null,
            customization: null,
            durationMinutes: null,
            providerWage: null,
            aptNo: null,
            address: null
          };
        }
      });

    // Get booking count per provider (from both booking_assignments AND bookings.provider_id)
    // Assigning from dashboard updates bookings.provider_id only, so we must count from actual bookings
    const assignmentCounts = new Map();
    safeBookings.forEach(booking => {
      const provider = getProviderForBooking(booking);
      if (provider && provider.id) {
        const currentCount = assignmentCounts.get(provider.id) || 0;
        assignmentCounts.set(provider.id, currentCount + 1);
      }
    });

    // Get available providers for the Available Providers section
    const availableProviders = providers && Array.isArray(providers) 
      ? providers.filter(provider => provider.availability_status === 'available' || !provider.availability_status)
        .slice(0, 5) // Limit to 5 providers
        .map(provider => ({
          id: provider.id,
          name: `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || provider.name || 'Unknown Provider',
          email: provider.email || '',
          phone: provider.phone || '',
          availability_status: provider.availability_status || 'available',
          performance_score: provider.performance_score || 0,
          customer_rating: provider.customer_rating || 0,
          services: [], // Would need to join with provider_services if needed
          hourly_rate: provider.hourly_rate || 0,
          last_active_at: provider.last_active_at,
          assignment_count: assignmentCounts.get(provider.id) || 0
        }))
      : [];

    return NextResponse.json({
      success: true,
      data: {
        stats,
        upcomingBookings,
        recentBookings,
        availableProviders,
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
