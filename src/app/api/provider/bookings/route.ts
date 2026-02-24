import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncBookingStatusToAdmin, syncProviderStatusToAdmin } from '@/lib/adminProviderSync';
import { getOccurrenceDatesForSeriesSync } from '@/lib/recurringBookings';

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

    // Get provider's bookings with customer info (include recurring_series_id for expansion)
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

    const formatPrice = (val: unknown) => `$${Number(val || 0).toFixed(2)}`;

    // Fetch recurring_series for any bookings that are part of a series (so we can expand occurrences)
    const recurringIds = [...new Set((bookings || []).filter((b: { recurring_series_id?: string }) => b.recurring_series_id).map((b: { recurring_series_id: string }) => b.recurring_series_id))];
    let seriesById: Record<string, { start_date: string; end_date?: string | null; frequency?: string | null; frequency_repeats?: string | null; occurrences_ahead?: number; scheduled_time?: string | null }> = {};
    if (recurringIds.length > 0) {
      const { data: seriesList } = await supabaseAdmin
        .from('recurring_series')
        .select('id, start_date, end_date, frequency, frequency_repeats, occurrences_ahead, scheduled_time')
        .in('id', recurringIds);
      seriesById = (seriesList || []).reduce((acc: Record<string, typeof seriesList[0]>, s) => {
        if (s?.id) acc[s.id] = s;
        return acc;
      }, {});
    }

    // Build list: expand recurring into one entry per occurrence so provider sees all dates
    const expanded: Array<{
      id: string;
      occurrence_date?: string;
      customer: { name: string; email: string; phone: string };
      service: string;
      date: string;
      time: string;
      status: string;
      amount: string;
      location: string;
      notes?: string;
      service_provider_notes?: string[];
      duration_minutes?: number | null;
      frequency?: string | null;
      customization?: Record<string, unknown> | null;
      apt_no?: string | null;
      zip_code?: string | null;
      payment_method?: string | null;
      provider_wage?: number | null;
      provider_wage_type?: string | null;
    }> = [];
    for (const booking of bookings || []) {
      const b = booking as Record<string, unknown>;
      const base = {
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
        notes: booking.notes,
        service_provider_notes: Array.isArray(booking.service_provider_notes) ? booking.service_provider_notes : (booking.service_provider_notes ? [booking.service_provider_notes] : []),
        duration_minutes: b.duration_minutes != null ? Number(b.duration_minutes) : null,
        frequency: (b.frequency as string) || null,
        customization: (b.customization as Record<string, unknown>) || null,
        apt_no: (b.apt_no as string) || null,
        zip_code: (b.zip_code as string) || null,
        payment_method: (b.payment_method as string) || null,
        provider_wage: b.provider_wage != null ? Number(b.provider_wage) : null,
        provider_wage_type: (b.provider_wage_type as string) || null,
      };
      const seriesId = (booking as { recurring_series_id?: string }).recurring_series_id;
      const series = seriesId ? seriesById[seriesId] : null;
      if (series) {
        const dates = getOccurrenceDatesForSeriesSync(series);
        const timeStr = series.scheduled_time || booking.scheduled_time || booking.time || '';
        const completedDates: string[] = Array.isArray((booking as { completed_occurrence_dates?: string[] }).completed_occurrence_dates)
          ? (booking as { completed_occurrence_dates: string[] }).completed_occurrence_dates
          : [];
        for (const d of dates) {
          const occurrenceStatus = completedDates.includes(d)
            ? 'completed'
            : (booking.status === 'cancelled' ? 'cancelled' : 'confirmed');
          expanded.push({
            ...base,
            date: d,
            time: timeStr,
            occurrence_date: d,
            status: occurrenceStatus,
          });
        }
      } else {
        expanded.push(base);
      }
    }
    // Sort by date desc then time for consistent list/calendar
    expanded.sort((a, b) => {
      const d = (b.date || '').localeCompare(a.date || '');
      if (d !== 0) return d;
      return (b.time || '').localeCompare(a.time || '');
    });

    const transformedBookings = expanded;

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

    const body = await request.json();
    const { bookingId, status, occurrence_date } = body;

    if (!bookingId || !status) {
      return NextResponse.json(
        { error: 'Booking ID and status are required' },
        { status: 400 }
      );
    }

    // Load current booking to check if recurring and handle per-occurrence completion
    const { data: existingBooking, error: fetchErr } = await supabaseAdmin
      .from('bookings')
      .select('id, recurring_series_id, completed_occurrence_dates')
      .eq('id', bookingId)
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id)
      .single();

    if (fetchErr || !existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const isRecurring = !!(existingBooking as { recurring_series_id?: string }).recurring_series_id;
    const completedDates = (existingBooking as { completed_occurrence_dates?: string[] }).completed_occurrence_dates;
    const completedList = Array.isArray(completedDates) ? completedDates : [];

    // Recurring + completing one occurrence: record that date only, do not set row status to completed
    if (isRecurring && status === 'completed' && occurrence_date && typeof occurrence_date === 'string') {
      const dateStr = String(occurrence_date).slice(0, 10); // YYYY-MM-DD
      if (!completedList.includes(dateStr)) {
        const { data: updatedBooking, error: updateError } = await supabaseAdmin
          .from('bookings')
          .update({
            completed_occurrence_dates: [...completedList, dateStr],
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId)
          .eq('provider_id', provider.id)
          .eq('business_id', provider.business_id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating recurring occurrence completion:', updateError);
          return NextResponse.json(
            { error: 'Failed to update booking' },
            { status: 500 }
          );
        }

        // Sync and notify (treat as one occurrence completed)
        await syncBookingStatusToAdmin({
          bookingId,
          providerId: provider.id,
          businessId: provider.business_id,
          status: 'completed',
          timestamp: new Date().toISOString(),
        });
        await syncProviderStatusToAdmin({
          providerId: provider.id,
          businessId: provider.business_id,
          status: 'available',
        });
        const { createAdminNotification } = await import('@/lib/adminProviderSync');
        await createAdminNotification(provider.business_id, 'booking_status_change', {
          title: 'Recurring occurrence completed',
          message: `Provider completed one occurrence (${dateStr}) of a recurring booking.`,
          link: '/admin/bookings',
          metadata: { bookingId, occurrence_date: dateStr },
        });

        return NextResponse.json({ success: true, booking: updatedBooking, occurrence_completed: dateStr });
      }
      return NextResponse.json({ success: true, booking: existingBooking, occurrence_completed: occurrence_date });
    }

    // Non-recurring or other status: update row status as before
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id)
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

    return NextResponse.json({ success: true, booking: updatedBooking });

  } catch (error) {
    console.error('Update booking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
