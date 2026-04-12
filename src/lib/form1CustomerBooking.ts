/**
 * Helpers so public book-now matches Industry → Form 1 (service category + frequency) settings.
 */

import type { BookingPopupSurface } from '@/lib/frequencyPopupDisplay';
import { normalizeFrequencyLabelForMatch } from '@/lib/industryFrequencyRepeats';

function normalizePricingVariableDisplayValue(raw: string | undefined | null): string {
  const t = (raw ?? 'customer_frontend_backend_admin').trim();
  if (t === 'admin_only' || t === 'customer_backend_admin' || t === 'customer_frontend_backend_admin') {
    return t;
  }
  return 'customer_frontend_backend_admin';
}

/** industry_pricing_variable.display — where the variable category appears on booking UIs. */
export function isPricingVariableDisplayVisibleOnBookingSurface(
  display: string | undefined | null,
  surface: BookingPopupSurface,
): boolean {
  const d = normalizePricingVariableDisplayValue(display);
  if (d === 'admin_only') return surface === 'admin_staff';
  if (d === 'customer_backend_admin') return surface === 'customer_backend' || surface === 'admin_staff';
  return true;
}

/** industry_exclude_parameter.display — Title Case values used since original table design. */
export function isExcludeParameterDisplayVisibleOnBookingSurface(
  display: string | undefined | null,
  surface: BookingPopupSurface,
): boolean {
  const d = String(display ?? '').trim();
  if (d === 'Admin Only') return surface === 'admin_staff';
  if (d === 'Customer Backend & Admin') return surface === 'customer_backend' || surface === 'admin_staff';
  return true;
}

/** Customer-facing label for an exclude row on book-now (Manage Exclude Parameters). */
export function getExcludeParameterCustomerDisplayName(param: {
  name: string;
  different_on_customer_end?: boolean | null;
  customer_end_name?: string | null;
}): string {
  if (param.different_on_customer_end && param.customer_end_name?.trim()) {
    return param.customer_end_name.trim();
  }
  return String(param.name ?? '').trim();
}

/** Customer-facing title for a service category card / summary (book-now). Internal `name` stays canonical for APIs. */
export function getServiceCategoryCustomerDisplayName(cat: {
  name: string;
  different_on_customer_end?: boolean | null;
  customer_end_name?: string | null;
}): string {
  if (cat.different_on_customer_end && cat.customer_end_name?.trim()) {
    return cat.customer_end_name.trim();
  }
  return String(cat.name ?? "").trim();
}

/** Rows from `/api/pricing-variables` (snake_case), used on book-now service cards. */
export type PricingVariableDefinitionForBooking = {
  category?: string | null;
  name?: string | null;
  different_on_customer_end?: boolean | null;
  customer_end_name?: string | null;
  show_explanation_icon_on_form?: boolean | null;
  explanation_tooltip_text?: string | null;
  enable_popup_on_selection?: boolean | null;
  popup_content?: string | null;
  popup_display?: string | null;
  display?: string | null;
};

/** Match Manage Variables row by category + option name (pricing parameter tier name). */
export function findPricingVariableDefinition(
  categoryKey: string,
  optionName: string | null | undefined,
  variables: PricingVariableDefinitionForBooking[] | null | undefined,
): PricingVariableDefinitionForBooking | undefined {
  const cat = String(categoryKey ?? "").trim();
  const name = String(optionName ?? "").trim();
  if (!cat || !name || name === "None") return undefined;
  return (variables ?? []).find(
    (v) => String(v.category ?? "").trim() === cat && String(v.name ?? "").trim() === name,
  );
}

/** First configured explanation tooltip for any row in this category (category-level info on the form). */
export function getPricingVariableCategoryExplanationTooltip(
  categoryKey: string,
  variables: PricingVariableDefinitionForBooking[] | null | undefined,
): string | null {
  const cat = String(categoryKey ?? "").trim();
  if (!cat) return null;
  const rows = (variables ?? []).filter((v) => String(v.category ?? "").trim() === cat);
  for (const r of rows) {
    if (r.show_explanation_icon_on_form && r.explanation_tooltip_text?.trim()) {
      return r.explanation_tooltip_text.trim();
    }
  }
  return null;
}

/** Book-now / service card label for a pricing variable category (matches Manage Variables). */
export function getPricingVariableCategoryCustomerLabel(
  categoryKey: string,
  variables: PricingVariableDefinitionForBooking[] | null | undefined,
): string {
  const k = String(categoryKey ?? "").trim();
  if (!k) return categoryKey;
  const rows = (variables ?? []).filter((v) => (v.category ?? "").trim() === k);
  if (rows.length === 0) return categoryKey;
  const withCustomer = rows.find(
    (r) => r.different_on_customer_end && r.customer_end_name?.trim(),
  );
  if (withCustomer?.customer_end_name?.trim()) return withCustomer.customer_end_name.trim();
  const first = rows[0];
  return (first.name ?? first.category ?? categoryKey).trim() || categoryKey;
}

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

/** industry_extras.display — kebab-case plus legacy Both / Booking / Quote. */
export function isIndustryExtraDisplayVisibleOnBookingSurface(
  display: string | undefined | null,
  surface: BookingPopupSurface,
): boolean {
  if (surface === 'admin_staff') return true;
  const d = String(display ?? '').trim();
  if (!d) return true;
  const lower = d.toLowerCase();
  if (lower === 'admin-only') return false;
  if (lower === 'quote') return false;
  if (lower === 'backend-admin') {
    return surface === 'customer_backend';
  }
  if (lower === 'frontend-backend-admin' || lower === 'both' || lower === 'booking') {
    return true;
  }
  return false;
}

/** Customer-facing label for an extra row (Manage Extras). */
export function getExtraCustomerDisplayName(extra: {
  name: string;
  different_on_customer_end?: boolean | null;
  customer_end_name?: string | null;
}): string {
  if (extra.different_on_customer_end && extra.customer_end_name?.trim()) {
    return extra.customer_end_name.trim();
  }
  return String(extra.name ?? '').trim();
}
