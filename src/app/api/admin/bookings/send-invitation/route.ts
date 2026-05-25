import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';
import { createAdminNotification } from '@/lib/adminProviderSync';

/**
 * POST: Create/send an invitation for an existing unassigned booking.
 * Body: { bookingId: string }
 * Use this when a booking is unassigned but no invitation was created (e.g. before fix, or failed).
 * The first provider (by priority) will see it in My Invitations.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const role = user.user_metadata?.role || 'owner';
    if (role === 'customer') return createForbiddenResponse('Customers cannot access admin endpoints');

    const body = await request.json().catch(() => ({}));
    const bookingId = body?.bookingId ?? request.nextUrl.searchParams.get('bookingId');
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: business, error: bizErr } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    if (bizErr || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }
    const businessId = business.id;

    const { data: booking, error: bookErr } = await supabase
      .from('bookings')
      .select('id, business_id, provider_id')
      .eq('id', bookingId)
      .eq('business_id', businessId)
      .single();
    if (bookErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    if (booking.provider_id) {
      return NextResponse.json({ error: 'Booking already has a provider assigned' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('provider_booking_invitations')
      .select('id, provider_id, status')
      .eq('booking_id', bookingId)
      .eq('business_id', businessId);
    const hasPending = (existing ?? []).some((r: { status: string }) => r.status === 'pending');
    if (hasPending) {
      return NextResponse.json({
        success: true,
        message: 'An invitation is already pending for this booking. Provider should see it in My Invitations.',
      });
    }

    const baseQuery = () =>
      supabase
        .from('service_providers')
        .select('id, first_name, last_name')
        .eq('business_id', businessId)
        .order('invitation_priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(10);

    let { data: providers } = await baseQuery().eq('status', 'active');
    if (!providers?.length) {
      const fallback = await baseQuery();
      providers = fallback.data ?? [];
    }
    if (!providers?.length) {
      return NextResponse.json({ error: 'No providers in this business to invite' }, { status: 400 });
    }

    const firstProvider = providers[0];
    const providerName = `${firstProvider.first_name || ''} ${firstProvider.last_name || ''}`.trim() || 'Provider';

    const { error: insertErr } = await supabase.from('provider_booking_invitations').insert({
      booking_id: bookingId,
      provider_id: firstProvider.id,
      business_id: businessId,
      status: 'pending',
      sort_order: 0,
    });
    if (insertErr) {
      console.error('[send-invitation] Insert failed', insertErr);
      return NextResponse.json({ error: 'Failed to create invitation: ' + insertErr.message }, { status: 500 });
    }

    await createAdminNotification(businessId, 'invitation_sent', {
      title: 'Booking invitation sent',
      message: `Invitation sent to ${providerName}. They will see it in My Invitations.`,
      link: '/admin/bookings',
    });

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${providerName}. They must log into the provider portal (as ${providerName}) and open My Invitations to see it.`,
      providerId: firstProvider.id,
      providerName,
    });
  } catch (e) {
    console.error('[send-invitation]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
