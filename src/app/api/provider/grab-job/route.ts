import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminNotification } from '@/lib/adminProviderSync';
import { notifyProviderOfBooking } from '@/lib/notifyProviderBooking';

/**
 * POST: Provider grabs an unassigned booking
 * Body: { bookingId: string }
 * Auth: Bearer token from provider session.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: provider } = await supabaseAdmin
      .from('service_providers')
      .select('id, business_id, first_name, last_name')
      .eq('user_id', user.id)
      .single();

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const { data: opts } = await supabaseAdmin
      .from('business_store_options')
      .select('providers_can_see_unassigned')
      .eq('business_id', provider.business_id)
      .maybeSingle();

    if (!opts?.providers_can_see_unassigned) {
      return NextResponse.json({ error: 'Grabbing jobs is not allowed' }, { status: 403 });
    }

    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from('bookings')
      .select('id, provider_id, business_id, customer_name, service')
      .eq('id', bookingId)
      .eq('business_id', provider.business_id)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.provider_id) {
      return NextResponse.json({ error: 'Booking is already assigned' }, { status: 409 });
    }

    const providerName = `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || 'Provider';

    const { error: updateErr } = await supabaseAdmin
      .from('bookings')
      .update({
        provider_id: provider.id,
        provider_name: providerName,
        status: 'confirmed',
        assignment_source: 'grab',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .eq('business_id', provider.business_id);

    if (updateErr) {
      console.error('Grab job update error:', updateErr);
      return NextResponse.json({ error: 'Failed to assign booking' }, { status: 500 });
    }

    // Notify admin
    if (provider.business_id) {
      try {
        await createAdminNotification(
          provider.business_id,
          'provider_grabbed_job',
          {
            title: 'Provider grabbed job',
            message: `${providerName} grabbed the booking for ${booking.customer_name || 'Customer'} - ${booking.service}`,
            link: `/admin/bookings?highlight=${bookingId}`,
          }
        );
      } catch {
        // Non-blocking
      }
    }

    try {
      await notifyProviderOfBooking(supabaseAdmin, { bookingId });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      message: 'Job added to your schedule',
    });
  } catch (e) {
    console.error('Provider grab job:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
