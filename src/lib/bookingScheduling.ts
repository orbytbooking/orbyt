/**
 * Scheduling: process new bookings based on store options
 * - accepted_automatically: auto-assign
 * - accept_or_decline: create invitation for first provider
 * - accepts_same_day_only: same-day = invite, future = auto
 */
import { createClient } from '@supabase/supabase-js';
import { createAdminNotification } from './adminProviderSync';
import { EmailService } from './emailService';
import { performAutoAssign } from './autoAssign';

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
    .select('provider_assignment_mode, scheduling_type')
    .eq('business_id', businessId)
    .maybeSingle();

  const providerAssignmentMode = (storeOpts as { provider_assignment_mode?: string } | null)?.provider_assignment_mode ?? 'automatic';
  if (providerAssignmentMode === 'manual') {
    // All bookings go to unassigned; admin or providers assign manually
    return;
  }

  // When no store options saved, default to accept_or_decline so we create an invitation (avoids silent auto-assign failure)
  const schedulingType = (storeOpts as { scheduling_type?: string } | null)?.scheduling_type ?? 'accept_or_decline';

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
      const result = await performAutoAssign(supabase, bookingId, businessId);
      if (result.success && result.assignment?.providerName) {
        await createAdminNotification(businessId, 'provider_assigned', {
          title: 'Booking auto-assigned',
          message: `Booking assigned to ${result.assignment.providerName}.`,
          link: '/admin/bookings',
        });
      } else if (!result.success) {
        console.warn('Auto-assign failed for booking', bookingId, result.error);
      }
    } catch (e) {
      console.warn('Auto-assign failed for booking', bookingId, e);
    }
    return;
  }

  if (shouldInvite) {
    // Get providers in priority order (active first; fallback to any provider if none active or query fails)
    const baseQuery = () =>
      supabase
        .from('service_providers')
        .select('id, first_name, last_name')
        .eq('business_id', businessId)
        .order('invitation_priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(10);

    let providers: { id: string; first_name?: string; last_name?: string }[] | null = null;
    try {
      const activeResult = await baseQuery().eq('status', 'active');
      if (activeResult.error) {
        const fallback = await baseQuery();
        providers = fallback.data ?? [];
      } else {
        providers = activeResult.data ?? [];
      }
    } catch (_e) {
      const fallback = await baseQuery();
      providers = fallback.data ?? [];
    }
    if (!providers?.length) {
      const fallback = await baseQuery();
      providers = fallback.data ?? [];
      if (providers?.length) {
        console.warn('[bookingScheduling] No active providers; using first available for invitation.', { businessId, bookingId });
      }
    }

    if (!providers?.length) {
      await createAdminNotification(businessId, 'no_providers', {
        title: 'No providers for new booking',
        message: 'A new booking was placed but no providers are available to invite.',
        link: '/admin/bookings',
      });

      const { data: booking } = await supabase
        .from('bookings')
        .select('customer_email, customer_name, service, scheduled_date, scheduled_time')
        .eq('id', bookingId)
        .single();
      const custEmail = (booking as { customer_email?: string } | null)?.customer_email;
      if (custEmail) {
        try {
          const { data: biz } = await supabase.from('businesses').select('name').eq('id', businessId).single();
          const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
          const emailService = new EmailService();
          await emailService.sendNeverFoundProviderEmail({
            to: custEmail,
            customerName: (booking as { customer_name?: string } | null)?.customer_name ?? 'Customer',
            businessName: (biz as { name?: string } | null)?.name ?? 'Your Business',
            service: (booking as { service?: string } | null)?.service ?? null,
            scheduledDate: (booking as { scheduled_date?: string } | null)?.scheduled_date ?? null,
            scheduledTime: (booking as { scheduled_time?: string } | null)?.scheduled_time ?? null,
            bookingRef: bkRef,
          });
        } catch (e) {
          console.warn('Never found provider email failed:', e);
        }
      }
      return;
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
      console.error('[bookingScheduling] Failed to create invitation', { bookingId, providerId: firstProvider.id, error: insertErr });
      await createAdminNotification(businessId, 'invitation_sent', {
        title: 'Booking invitation failed',
        message: `Could not create invitation for ${providerName}. Please assign manually in Bookings.`,
        link: '/admin/bookings',
      });
      return;
    }

    await createAdminNotification(businessId, 'invitation_sent', {
      title: 'Booking invitation sent',
      message: `Invitation sent to ${providerName}. Booking is in Unassigned until accepted.`,
      link: '/admin/bookings',
    });
  }
}
