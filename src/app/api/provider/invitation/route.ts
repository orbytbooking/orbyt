import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminNotification } from '@/lib/adminProviderSync';
import { EmailService } from '@/lib/emailService';

/**
 * GET: List pending invitations for the current provider
 * Auth: Bearer token from provider session (same as /api/provider/bookings).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      .select('id, business_id')
      .eq('user_id', user.id)
      .single();

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Fetch invitation rows first (no join) so we always return pending invitations even if booking join fails
    const { data: invitationRows, error: invError } = await supabaseAdmin
      .from('provider_booking_invitations')
      .select('id, booking_id, status, sent_at')
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id)
      .eq('status', 'pending')
      .order('sent_at', { ascending: false });

    if (invError) {
      console.error('Provider invitations GET (invitations)', invError);
      return NextResponse.json({ error: 'Failed to load invitations', invitations: [] }, { status: 500 });
    }

    const rows = invitationRows ?? [];
    if (rows.length === 0) {
      return NextResponse.json({ invitations: [] });
    }

    const bookingIds = [...new Set(rows.map((r: { booking_id: string }) => r.booking_id))];
    const { data: bookingRows } = await supabaseAdmin
      .from('bookings')
      .select('id, service, scheduled_date, scheduled_time, date, time, address, apt_no, total_price, customer_name, customer_phone')
      .in('id', bookingIds);

    const bookingMap = new Map<string, any>();
    (bookingRows ?? []).forEach((b: any) => bookingMap.set(b.id, b));

    const list = rows.map((inv: any) => {
      const b = bookingMap.get(inv.booking_id);
      return {
        id: inv.id,
        bookingId: inv.booking_id,
        status: inv.status,
        sentAt: inv.sent_at,
        ...(b && {
          service: b.service,
          date: b.scheduled_date ?? b.date,
          time: b.scheduled_time ?? b.time,
          address: b.address,
          aptNo: b.apt_no,
          totalPrice: b.total_price,
          customerName: b.customer_name,
          customerPhone: b.customer_phone,
        }),
      };
    });

    return NextResponse.json({ invitations: list });
  } catch (e) {
    console.error('Provider invitations GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST: Accept or decline an invitation
 * Body: { invitationId: string, action: 'accept' | 'decline', notes?: string }
 * Auth: Bearer token from provider session.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invitationId, action, notes } = body as { invitationId: string; action: 'accept' | 'decline'; notes?: string };

    if (!invitationId || !action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid invitationId or action' }, { status: 400 });
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

    const { data: invitation } = await supabaseAdmin
      .from('provider_booking_invitations')
      .select('id, booking_id, provider_id, business_id, status')
      .eq('id', invitationId)
      .eq('provider_id', provider.id)
      .eq('status', 'pending')
      .single();

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found or already responded' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const providerName = `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || 'Provider';

    if (action === 'accept') {
      await supabaseAdmin
        .from('provider_booking_invitations')
        .update({ status: 'accepted', responded_at: now, response_notes: notes ?? null })
        .eq('id', invitationId);

      await supabaseAdmin
        .from('bookings')
        .update({
          provider_id: provider.id,
          provider_name: providerName,
          status: 'confirmed',
          assignment_source: 'invitation',
          updated_at: now,
        })
        .eq('id', invitation.booking_id)
        .eq('business_id', provider.business_id);

      await createAdminNotification(provider.business_id, 'invitation_accepted', {
        title: 'Provider accepted booking',
        message: `${providerName} accepted the booking invitation.`,
        link: '/admin/bookings',
      });

      return NextResponse.json({ success: true, message: 'Booking added to your schedule' });
    }

    // Decline
    await supabaseAdmin
      .from('provider_booking_invitations')
      .update({ status: 'declined', responded_at: now, response_notes: notes ?? null })
      .eq('id', invitationId);

    // Invite next provider
    const { data: nextProviders } = await supabaseAdmin
      .from('service_providers')
      .select('id, first_name, last_name')
      .eq('business_id', provider.business_id)
      .eq('status', 'active')
      .neq('id', provider.id)
      .order('invitation_priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(5);

    const { data: alreadyInvited } = await supabaseAdmin
      .from('provider_booking_invitations')
      .select('provider_id')
      .eq('booking_id', invitation.booking_id);

    const invitedIds = new Set((alreadyInvited ?? []).map((r: any) => r.provider_id));
    const nextProvider = nextProviders?.find((p) => !invitedIds.has(p.id));

    if (nextProvider) {
      await supabaseAdmin.from('provider_booking_invitations').insert({
        booking_id: invitation.booking_id,
        provider_id: nextProvider.id,
        business_id: provider.business_id,
        status: 'pending',
        sort_order: (alreadyInvited?.length ?? 0),
      });
      const nextName = `${nextProvider.first_name || ''} ${nextProvider.last_name || ''}`.trim();
      await createAdminNotification(provider.business_id, 'invitation_sent', {
        title: 'Next provider invited',
        message: `${providerName} declined. Invitation sent to ${nextName}.`,
        link: '/admin/bookings',
      });
    } else {
      await createAdminNotification(provider.business_id, 'no_providers', {
        title: 'All providers declined',
        message: `No provider accepted the booking. It remains in Unassigned.`,
        link: '/admin/bookings',
      });

      const custEmail = await (async () => {
        const { data: b } = await supabaseAdmin
          .from('bookings')
          .select('customer_email, customer_name, service, scheduled_date, scheduled_time')
          .eq('id', invitation.booking_id)
          .single();
        return (b as { customer_email?: string } | null)?.customer_email;
      })();
      if (custEmail) {
        try {
          const { data: b } = await supabaseAdmin
            .from('bookings')
            .select('customer_name, service, scheduled_date, scheduled_time')
            .eq('id', invitation.booking_id)
            .single();
          const { data: biz } = await supabaseAdmin
            .from('businesses')
            .select('name')
            .eq('id', provider.business_id)
            .single();
          const bkRef = `BK${String(invitation.booking_id).slice(-6).toUpperCase()}`;
          const emailService = new EmailService();
          await emailService.sendNeverFoundProviderEmail({
            to: custEmail,
            customerName: (b as { customer_name?: string } | null)?.customer_name ?? 'Customer',
            businessName: (biz as { name?: string } | null)?.name ?? 'Your Business',
            service: (b as { service?: string } | null)?.service ?? null,
            scheduledDate: (b as { scheduled_date?: string } | null)?.scheduled_date ?? null,
            scheduledTime: (b as { scheduled_time?: string } | null)?.scheduled_time ?? null,
            bookingRef: bkRef,
          });
        } catch (e) {
          console.warn('Never found provider email failed:', e);
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Invitation declined' });
  } catch (e) {
    console.error('Provider invitation POST:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
