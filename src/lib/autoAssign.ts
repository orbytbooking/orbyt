/**
 * Core auto-assign logic: pick a provider for a booking and assign.
 * Used by API route and by processBookingScheduling so it runs in-process (no HTTP).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getStoreOptionsScheduling } from './schedulingFilters';
import { createAdminNotification } from './adminProviderSync';
import { notifyProviderOfBooking } from './notifyProviderBooking';

export type AutoAssignResult =
  | { success: true; assignment: { providerName: string } }
  | { success: false; error?: string };

export type EligibilityProvider = {
  id: string;
  name: string;
  invitation_priority: number;
  score: number;
  reasons: string[];
  eligible: boolean;
};

/** Preview eligibility for a hypothetical booking (no assignment). Used by admin UI. */
export async function getEligibilityPreview(
  supabaseAdmin: SupabaseClient,
  businessId: string,
  opts: { scheduledDate?: string; serviceId?: string; durationMinutes?: number } = {}
): Promise<EligibilityProvider[]> {
  const { data: providers, error } = await supabaseAdmin
    .from('service_providers')
    .select(`
      id, first_name, last_name, invitation_priority, created_at,
      provider_services(service_id, skill_level, is_primary_service),
      provider_preferences(auto_assignments),
      provider_capacity(max_concurrent_bookings, max_daily_bookings, current_workload)
    `)
    .eq('business_id', businessId)
    .eq('status', 'active');

  if (error || !providers) return [];

  const storeOpts = await getStoreOptionsScheduling(businessId);
  const maxMinutes = storeOpts?.max_minutes_per_provider_per_booking;
  const bookingDurationMins = opts.durationMinutes ?? 60;
  const hasServiceId = opts.serviceId != null && String(opts.serviceId).trim() !== '';

  const list: EligibilityProvider[] = (providers as any[]).map((provider: any) => {
    const prefs = provider.provider_preferences?.[0];
    const optedOut = prefs && prefs.auto_assignments === false;
    const canDoService = !hasServiceId || provider.provider_services?.some((ps: any) => ps.service_id === opts.serviceId);
    const overMaxMinutes = maxMinutes != null && maxMinutes > 0 && bookingDurationMins > maxMinutes;
    const capacity = provider.provider_capacity?.[0];
    const atFullCapacity = capacity && capacity.current_workload >= 100;
    const eligible = !optedOut && canDoService && !overMaxMinutes && !atFullCapacity;

    let score = 0;
    const reasons: string[] = [];
    if (optedOut) reasons.push('Does not accept auto-assignments');
    if (hasServiceId && !canDoService) reasons.push('Does not provide this service');
    if (overMaxMinutes) reasons.push('Booking duration exceeds max');
    if (atFullCapacity) reasons.push('At full capacity');
    if (eligible) {
      if (hasServiceId && canDoService) {
        score += 30;
        reasons.push('Service match');
      } else if (!hasServiceId) {
        score += 20;
        reasons.push('Any provider');
      }
      if (capacity) score += Math.max(0, 20 - (capacity.current_workload || 0));
      if (capacity && !atFullCapacity) reasons.push(`Workload: ${capacity.current_workload ?? 0}%`);
    }

    const name = `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || 'Provider';
    return {
      id: provider.id,
      name,
      invitation_priority: Number(provider.invitation_priority ?? 0),
      score,
      reasons,
      eligible,
    };
  });

  list.sort((a, b) => {
    if (b.invitation_priority !== a.invitation_priority) return b.invitation_priority - a.invitation_priority;
    if (b.score !== a.score) return b.score - a.score;
    return 0;
  });

  return list;
}

export async function performAutoAssign(
  supabaseAdmin: SupabaseClient,
  bookingId: string,
  businessId: string
): Promise<AutoAssignResult> {
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('business_id', businessId)
    .single();

  if (bookingError || !booking) {
    return { success: false, error: 'Booking not found' };
  }

  const { data: providers, error: providersError } = await supabaseAdmin
    .from('service_providers')
    .select(`
      *,
      provider_services(service_id, skill_level, is_primary_service),
      provider_preferences(auto_assignments),
      provider_capacity(max_concurrent_bookings, max_daily_bookings, current_workload)
    `)
    .eq('business_id', businessId)
    .eq('status', 'active');

  if (providersError) {
    console.error('Auto-assign providers fetch:', providersError);
    return { success: false, error: 'Failed to fetch providers' };
  }

  const storeOpts = await getStoreOptionsScheduling(businessId);
  const maxMinutes = storeOpts?.max_minutes_per_provider_per_booking;
  const bookingDurationMins = booking.duration_minutes != null ? Number(booking.duration_minutes) : 60;
  const hasServiceId = booking.service_id != null && String(booking.service_id).trim() !== '';

  const scoredProviders = (providers || [])
    .filter((provider: any) => {
      const prefs = provider.provider_preferences?.[0];
      if (prefs && prefs.auto_assignments === false) return false;
      if (hasServiceId) {
        const canDo = provider.provider_services?.some((ps: any) => ps.service_id === booking.service_id);
        if (!canDo) return false;
      }
      if (maxMinutes != null && maxMinutes > 0 && bookingDurationMins > maxMinutes) return false;
      const capacity = provider.provider_capacity?.[0];
      if (capacity && capacity.current_workload >= 100) return false;
      return true;
    })
    .map((provider: any) => {
      let score = 0;
      const reasons: string[] = [];
      if (hasServiceId && provider.provider_services?.some((ps: any) => ps.service_id === booking.service_id)) {
        score += 30;
        reasons.push('Service match');
      } else if (!hasServiceId) {
        score += 20;
        reasons.push('Any provider');
      }
      const cap = provider.provider_capacity?.[0];
      if (cap) score += Math.max(0, 20 - (cap.current_workload || 0));
      return { provider, score, reasons };
    })
    // BookingKoala-style: priority order first, then score, then created_at for tie-breaks
    .sort((a: any, b: any) => {
      const priA = Number(a.provider?.invitation_priority ?? 0);
      const priB = Number(b.provider?.invitation_priority ?? 0);
      if (priB !== priA) return priB - priA; // higher priority first
      if (b.score !== a.score) return b.score - a.score; // then by score
      const createdA = a.provider?.created_at ?? '';
      const createdB = b.provider?.created_at ?? '';
      return createdA.localeCompare(createdB); // then oldest first (stable)
    });

  let bestMatch: { provider: any; score: number; reasons: string[] };
  if (scoredProviders.length === 0) {
    const { data: fallback } = await supabaseAdmin
      .from('service_providers')
      .select('id, first_name, last_name')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .order('invitation_priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);
    const p = fallback?.[0];
    if (!p) return { success: false, error: 'No active providers for this business' };
    bestMatch = { provider: p, score: 0, reasons: ['Fallback by priority'] };
  } else {
    bestMatch = scoredProviders[0];
  }

  const providerName = `${bestMatch.provider.first_name || ''} ${bestMatch.provider.last_name || ''}`.trim() || 'Provider';

  const { error: assignmentError } = await supabaseAdmin
    .from('booking_assignments')
    .insert({
      booking_id: bookingId,
      provider_id: bestMatch.provider.id,
      assignment_type: 'auto',
      status: 'assigned',
      auto_assignment_score: bestMatch.score,
    });

  if (assignmentError) {
    console.error('Auto-assign booking_assignments insert:', assignmentError);
    return { success: false, error: 'Failed to create assignment' };
  }

  const { error: updateError } = await supabaseAdmin
    .from('bookings')
    .update({
      provider_id: bestMatch.provider.id,
      provider_name: providerName,
      status: 'confirmed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (updateError) {
    console.error('Auto-assign booking update:', updateError);
    return { success: false, error: 'Failed to update booking' };
  }

  await supabaseAdmin.from('assignment_logs').insert({
    booking_id: bookingId,
    provider_id: bestMatch.provider.id,
    action: 'assigned',
    assignment_score: bestMatch.score,
    rule_applied: 'auto-assignment',
  });

  const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
  await createAdminNotification(businessId, 'booking_assigned', {
    title: 'Booking assigned',
    message: `Provider ${providerName} was assigned to booking ${bkRef}.`,
    link: '/admin/bookings',
  });

  try {
    await notifyProviderOfBooking(supabaseAdmin, { bookingId });
  } catch (e) {
    console.warn('Provider booking email notification failed:', e);
  }

  return { success: true, assignment: { providerName } };
}
