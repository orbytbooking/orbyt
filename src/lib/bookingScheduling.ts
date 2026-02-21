/**
 * Booking Koala scheduling: process new bookings based on store options
 * - accepted_automatically: auto-assign
 * - accept_or_decline: create invitation for first provider
 * - accepts_same_day_only: same-day = invite, future = auto
 */
import { createClient } from '@supabase/supabase-js';
import { createAdminNotification } from './adminProviderSync';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function processBookingScheduling(
  bookingId: string,
  businessId: string,
  opts: {
    providerId?: string | null;
    scheduledDate?: string | null;
    service?: string | null;
  }
): Promise<void> {
  if (!supabaseUrl || !supabaseServiceKey) return;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // Customer already selected a provider - no scheduling logic needed
  if (opts.providerId) return;

  const { data: storeOpts } = await supabase
    .from('business_store_options')
    .select('scheduling_type')
    .eq('business_id', businessId)
    .maybeSingle();

  const schedulingType = storeOpts?.scheduling_type ?? 'accepted_automatically';

  const isSameDay = (() => {
    if (!opts.scheduledDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return opts.scheduledDate === today;
  })();

  let shouldAutoAssign = schedulingType === 'accepted_automatically';
  let shouldInvite = schedulingType === 'accept_or_decline';

  if (schedulingType === 'accepts_same_day_only') {
    shouldAutoAssign = !isSameDay;
    shouldInvite = isSameDay;
  }

  if (shouldAutoAssign) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      const res = await fetch(`${baseUrl}/api/admin/auto-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, businessId }),
      });
      if (res.ok) {
        const data = await res.json();
        const providerName = data.assignment?.providerName;
        if (data.success && providerName) {
          await createAdminNotification(businessId, 'provider_assigned', {
            title: 'Booking auto-assigned',
            message: `Booking assigned to ${providerName}.`,
            link: '/admin/bookings',
          });
        }
      }
    } catch (e) {
      console.warn('Auto-assign failed for booking', bookingId, e);
    }
    return;
  }

  if (shouldInvite) {
    // Get providers in priority order (higher invitation_priority first, then by created_at)
    const { data: providers } = await supabase
      .from('service_providers')
      .select('id, first_name, last_name')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .order('invitation_priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);

    if (!providers?.length) {
      await createAdminNotification(businessId, 'no_providers', {
        title: 'No providers for new booking',
        message: 'A new booking was placed but no providers are available to invite.',
        link: '/admin/bookings',
      });
      return;
    }

    const firstProvider = providers[0];
    const providerName = `${firstProvider.first_name || ''} ${firstProvider.last_name || ''}`.trim() || 'Provider';

    await supabase.from('provider_booking_invitations').insert({
      booking_id: bookingId,
      provider_id: firstProvider.id,
      business_id: businessId,
      status: 'pending',
      sort_order: 0,
    });

    await createAdminNotification(businessId, 'invitation_sent', {
      title: 'Booking invitation sent',
      message: `Invitation sent to ${providerName}. Booking is in Unassigned until accepted.`,
      link: '/admin/bookings',
    });
  }
}
