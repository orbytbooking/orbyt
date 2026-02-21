import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncBookingStatusToAdmin, syncProviderStatusToAdmin } from '@/lib/adminProviderSync';

export async function GET(request: NextRequest) {
  try {
    console.log('=== PROVIDER BOOKINGS API ===');
    
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
    console.log('=== PROVIDER BOOKINGS API DEBUG ===');
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

    // Get provider's bookings with customer info
    console.log(`📋 Fetching bookings for provider ${provider.id} (business: ${provider.business_id})`);
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        customers(name, email, phone)
      `)
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id) // CRITICAL: Filter by business ID
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError);
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    console.log(`✅ Found ${bookings?.length || 0} bookings for provider ${provider.id}`);
    if (bookings && bookings.length > 0) {
      console.log('   Bookings:', bookings.map(b => ({
        id: b.id,
        customer: b.customer_name,
        date: b.scheduled_date || b.date,
        time: b.scheduled_time || b.time,
        status: b.status,
        provider_id: b.provider_id
      })));
    }

    const formatPrice = (val: unknown) => `$${Number(val || 0).toFixed(2)}`;

    // Transform data to match frontend expectations
    const transformedBookings = bookings?.map(booking => ({
      id: booking.id,
      customer: {
        name: booking.customers?.name || booking.customer_name || 'Unknown',
        email: booking.customers?.email || booking.customer_email || '',
        phone: booking.customers?.phone || booking.customer_phone || ''
      },
      service: booking.service || 'Service',
      date: booking.scheduled_date || booking.date || '',
      time: booking.scheduled_time || booking.time || '',
      status: booking.status || 'pending',
      amount: formatPrice(booking.total_price ?? booking.amount),
      location: booking.address || '',
      notes: booking.notes
    })) || [];

    // Calculate stats
    const stats = {
      total: transformedBookings.length,
      pending: transformedBookings.filter(b => b.status === 'pending').length,
      confirmed: transformedBookings.filter(b => b.status === 'confirmed').length,
      completed: transformedBookings.filter(b => b.status === 'completed').length,
      cancelled: transformedBookings.filter(b => b.status === 'cancelled').length,
    };

    // Return format expected by frontend
    return NextResponse.json({
      provider: {
        id: provider.id,
        name: `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || provider.name || 'Provider',
        email: provider.email || ''
      },
      bookings: transformedBookings,
      stats
    });

  } catch (error) {
    console.error('Bookings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('=== UPDATE BOOKING STATUS API ===');
    
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

    const { bookingId, status } = await request.json();

    if (!bookingId || !status) {
      return NextResponse.json(
        { error: 'Booking ID and status are required' },
        { status: 400 }
      );
    }

    // Update booking status
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .eq('provider_id', provider.id) // Ensure provider can only update their own bookings
      .eq('business_id', provider.business_id) // CRITICAL: Ensure booking belongs to provider's business
      .select()
      .single();

    if (updateError) {
      console.error('Error updating booking:', updateError);
      return NextResponse.json(
        { error: 'Failed to update booking' },
        { status: 500 }
      );
    }

    // Sync status change with admin system
    const syncResult = await syncBookingStatusToAdmin({
      bookingId,
      providerId: provider.id,
      businessId: provider.business_id,
      status: status as any,
      timestamp: new Date().toISOString()
    });

    if (!syncResult.success) {
      console.warn('Failed to sync with admin system:', syncResult.error);
      // Don't fail the request, but log the sync issue
    }

    // Update provider status based on booking status
    let providerStatus: 'available' | 'busy' | 'unavailable' = 'available';
    if (status === 'in_progress') {
      providerStatus = 'busy';
    } else if (status === 'completed') {
      providerStatus = 'available';
    }

    await syncProviderStatusToAdmin({
      providerId: provider.id,
      businessId: provider.business_id,
      status: providerStatus,
      currentBookingId: status === 'in_progress' ? bookingId : undefined
    });

    // Create admin notification for booking status change
    if (['completed', 'in_progress', 'cancelled', 'confirmed'].includes(status)) {
      const { createAdminNotification } = await import('@/lib/adminProviderSync');
      await createAdminNotification(provider.business_id, 'booking_status_change', {
        title: `Booking ${status}`,
        message: `Provider ${provider.first_name} ${provider.last_name} updated booking status to ${status}`,
        link: '/admin/bookings',
        metadata: {
          bookingId,
          providerId: provider.id,
          status,
          timestamp: new Date().toISOString()
        }
      });
    }

    return NextResponse.json(updatedBooking);

  } catch (error) {
    console.error('Update booking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
