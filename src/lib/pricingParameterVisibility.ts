/**
 * Mirrors AddBookingForm variable / pricing-parameter filtering (lines ~2940–3026) for customer book-now.
 */

import {
  frequencyDepOptionNamesForCategory,
  type FrequencyDependencies,
} from '@/lib/frequencyFilter';

export function splitCommaList(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(/,\s*/).map((s) => s.trim()).filter(Boolean);
}

/**
 * AddBookingForm: `option.frequency.split(', ').map(f => f.trim())` then `includes(newBooking.frequency)`.
 * Fallback: comma without spaces (common in DB).
 */
export function adminFrequencyCsvMatchesSelection(
  paramFrequencyCsv: string | null | undefined,
  selectedFrequency: string,
): boolean {
  const sel = selectedFrequency.trim();
  if (!sel || !paramFrequencyCsv?.trim()) return false;
  const primary = paramFrequencyCsv.split(', ').map((f) => f.trim()).filter(Boolean);
  if (primary.includes(sel)) return true;
  return paramFrequencyCsv
    .split(/\s*,\s*/)
    .map((f) => f.trim())
    .filter(Boolean)
    .includes(sel);
}

/**
 * AddBookingForm: `option.service_category.split(', ').map(sc => sc.trim())` then `includes(newBooking.service)`.
 */
export function adminServiceCategoryCsvMatchesSelection(
  paramServiceCategoryCsv: string | null | undefined,
  selectedServiceName: string,
): boolean {
  const svc = selectedServiceName.trim();
  if (!svc || !paramServiceCategoryCsv?.trim()) return false;
  const primary = paramServiceCategoryCsv.split(', ').map((s) => s.trim()).filter(Boolean);
  if (primary.includes(svc)) return true;
  return paramServiceCategoryCsv
    .split(/\s*,\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(svc);
}

function isCustomerPricingDisplay(display: unknown): boolean {
  const d = String(display ?? '').trim();
  if (d === 'Admin Only') return false;
  if (!d) return true;
  return d.includes('Customer') || d.includes('Frontend') || d.includes('customer') || d.includes('frontend');
}

export type PricingParamRow = {
  id?: string;
  name: string;
  variable_category: string;
  display?: string;
  frequency?: string | null;
  service_category?: string | null;
  show_based_on_frequency?: boolean;
  show_based_on_service_category?: boolean;
  price?: number;
  time_minutes?: number;
  sort_order?: number;
};

/**
 * Build grouped variables for FrequencyAwareServiceCard (category → options).
 */
export function buildCustomerAvailableVariables(
  params: PricingParamRow[],
  selectedService: { name: string; raw?: Record<string, unknown> } | null,
  selectedFrequency: string,
  frequencyDependencies?: FrequencyDependencies | null,
): Record<string, { id: string; name: string; variable_category: string }[]> {
  if (!params.length || !selectedService?.name) return {};

  const rawCat = selectedService.raw as
    | {
        service_category_frequency?: boolean;
        variables?: Record<string, string[]>;
      }
    | undefined;

  const useFrequencyDeps = Boolean(rawCat?.service_category_frequency);
  const serviceName = selectedService.name.trim();
  const freqTrim = selectedFrequency.trim();

  const grouped: Record<string, { id: string; name: string; variable_category: string }[]> = {};

  for (const param of params) {
    if (!isCustomerPricingDisplay(param.display)) continue;

    const rawCategory = String(param.variable_category ?? '').trim();
    if (!rawCategory) continue;

    let visible = false;

    if (useFrequencyDeps) {
      if (param.show_based_on_frequency) {
        if (!freqTrim || !param.frequency?.trim()) {
          visible = false;
        } else {
          visible = adminFrequencyCsvMatchesSelection(param.frequency, freqTrim);
        }
      } else {
        visible = true;
      }

      if (!visible) continue;

      if (param.show_based_on_service_category) {
        if (!param.service_category?.trim()) continue;
        if (!adminServiceCategoryCsvMatchesSelection(param.service_category, serviceName)) continue;
      }
    } else {
      const vars = rawCat?.variables;
      if (vars && vars[rawCategory] && Array.isArray(vars[rawCategory])) {
        visible = vars[rawCategory].includes(param.name);
      } else {
        visible = false;
      }
    }

    if (!visible) continue;
    if (!grouped[rawCategory]) grouped[rawCategory] = [];
    grouped[rawCategory].push({
      id: String(param.id ?? `${rawCategory}-${param.name}`),
      name: param.name,
      variable_category: rawCategory,
    });
  }

  if (useFrequencyDeps && frequencyDependencies) {
    for (const rawCategory of Object.keys(grouped)) {
      const allowed = frequencyDepOptionNamesForCategory(rawCategory, frequencyDependencies);
      if (allowed === null) continue;
      if (allowed.length === 0) {
        delete grouped[rawCategory];
        continue;
      }
      const next = grouped[rawCategory].filter((v) => allowed.includes(v.name));
      if (next.length === 0) delete grouped[rawCategory];
      else grouped[rawCategory] = next;
    }
  }

  return grouped;
}

/** For summing line items: same rules as admin calculateServiceTotal. */
export function pricingParamAppliesToSelection(
  param: {
    show_based_on_frequency?: boolean;
    frequency?: string | null;
    show_based_on_service_category?: boolean;
    service_category?: string | null;
  },
  selectedFrequency: string,
  selectedServiceName: string,
): boolean {
  const freqTrim = selectedFrequency.trim();
  const svcTrim = selectedServiceName.trim();

  if (param.show_based_on_frequency && param.frequency?.trim()) {
    if (!adminFrequencyCsvMatchesSelection(param.frequency, freqTrim)) return false;
  }

  if (param.show_based_on_service_category && param.service_category?.trim()) {
    if (!adminServiceCategoryCsvMatchesSelection(param.service_category, svcTrim)) return false;
  }

  return true;
}
