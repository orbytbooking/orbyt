/**
 * Helpers so public book-now matches Industry → Form 1 (service category + frequency) settings.
 */

import { normalizeFrequencyLabelForMatch } from '@/lib/industryFrequencyRepeats';

/** industry_service_category.display — hide only admin-only rows on customer booking. */
export function isServiceCategoryVisibleOnPublicBooking(display: string | undefined | null): boolean {
  if (display == null || String(display).trim() === '') return true;
  const d = String(display).trim();
  if (d === 'admin_only') return false;
  return d === 'customer_frontend_backend_admin' || d === 'customer_backend_admin';
}

/** industry_service_category.display_service_length_customer */
export function showServiceDurationOnCustomerBooking(
  displayServiceLengthCustomer: string | undefined | null,
): boolean {
  return displayServiceLengthCustomer === 'customer_frontend_backend_admin';
}

/**
 * When service_category_frequency is on, only these frequency labels are offered (AddBookingForm parity).
 */
export function filterFrequencyOptionsForServiceCategory(
  allOptions: string[],
  raw: { service_category_frequency?: boolean; selected_frequencies?: string[] } | undefined,
): string[] {
  if (!allOptions.length) return [];
  if (!raw?.service_category_frequency || !raw.selected_frequencies?.length) {
    return allOptions;
  }
  return allOptions.filter((opt) =>
    raw.selected_frequencies!.some(
      (sf) => normalizeFrequencyLabelForMatch(sf) === normalizeFrequencyLabelForMatch(opt),
    ),
  );
}

/** Ensure selected frequency is allowed for this service category (Form 1 selected_frequencies). */
export function pickEffectiveFrequencyForCard(current: string | undefined, allowed: string[]): string {
  if (!allowed.length) return (current ?? '').trim();
  const t = (current ?? '').trim();
  if (
    t &&
    allowed.some((o) => normalizeFrequencyLabelForMatch(o) === normalizeFrequencyLabelForMatch(t))
  ) {
    return (
      allowed.find((o) => normalizeFrequencyLabelForMatch(o) === normalizeFrequencyLabelForMatch(t)) ??
      allowed[0]
    );
  }
  return allowed[0];
}
