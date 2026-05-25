/**
 * Notify a provider by email when a booking is assigned to them.
 * Respects provider_preferences.email_notifications.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { EmailService } from './emailService';

export type NotifyProviderOptions = { bookingId: string };

/**
 * Load booking, assigned provider, business name and preferences; send one-time
 * "booking assigned" email if the provider has email notifications enabled.
 * No-op if booking has no provider_id, provider has no email, or notifications disabled.
 */
export async function notifyProviderOfBooking(
  supabaseAdmin: SupabaseClient,
  options: NotifyProviderOptions
): Promise<{ sent: boolean; reason?: string }> {
  const { bookingId } = options;

  const { data: booking, error: bookingErr } = await supabaseAdmin
    .from('bookings')
    .select(
      'id, business_id, provider_id, service, scheduled_date, scheduled_time, date, time, address, customer_name'
    )
    .eq('id', bookingId)
    .single();

  if (bookingErr || !booking) {
    return { sent: false, reason: 'Booking not found' };
  }

  const providerId = booking.provider_id;
  if (!providerId) {
    return { sent: false, reason: 'No provider assigned' };
  }

  const { data: provider, error: providerErr } = await supabaseAdmin
    .from('service_providers')
    .select('id, email, first_name, last_name')
    .eq('id', providerId)
    .single();

  if (providerErr || !provider) {
    return { sent: false, reason: 'Provider not found' };
  }

  const email = provider?.email?.trim();
  if (!email) {
    return { sent: false, reason: 'Provider has no email' };
  }

  const { data: prefs } = await supabaseAdmin
    .from('provider_preferences')
    .select('email_notifications')
    .eq('provider_id', providerId)
    .maybeSingle();

  if (prefs && prefs.email_notifications === false) {
    return { sent: false, reason: 'Provider has email notifications disabled' };
  }

  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('name')
    .eq('id', booking.business_id)
    .single();

  const businessName = business?.name || 'Your business';
  const firstName = provider.first_name || 'Provider';
  const bookingRef = `BK${String(booking.id).slice(-6).toUpperCase()}`;

  const emailService = new EmailService();
  const scheduledDate = booking.scheduled_date ?? (booking as { date?: string }).date ?? null;
  const scheduledTime = booking.scheduled_time ?? (booking as { time?: string }).time ?? null;
  const address = booking.address ?? null;

  const sent = await emailService.sendProviderBookingAssigned({
    to: email,
    providerFirstName: firstName,
    businessName,
    service: booking.service ?? null,
    scheduledDate: scheduledDate ?? null,
    scheduledTime: scheduledTime ?? null,
    address,
    customerName: booking.customer_name ?? null,
    bookingRef,
  });

  return { sent };
}
