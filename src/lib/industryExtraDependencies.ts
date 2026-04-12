import { normalizeFrequencyLabelForMatch } from '@/lib/industryFrequencyRepeats';

/** Minimal extra row for dependency checks (API / admin state). */
export type IndustryExtraDependencyRow = {
  id: string;
  show_based_on_frequency?: boolean;
  frequency_options?: string[] | null;
  show_based_on_service_category?: boolean;
  service_category_options?: string[] | null;
  show_based_on_variables?: boolean;
  variable_options?: string[] | null;
};

export type IndustryExtraDependencyContext = {
  selectedFrequency: string;
  selectedServiceCategoryName: string;
  selectedServiceCategoryId?: string;
  /** Variable category key → selected pricing-parameter option name, or "None". */
  categoryValues: Record<string, string>;
  /** True when the service category has `service_category_frequency` (Form 1 frequency deps). */
  serviceCategoryUsesFrequencyDeps: boolean;
  /** When frequency deps apply: fetch completed (`frequencyDependencies !== null`). */
  frequencyDepsLoaded: boolean;
  /** IDs listed on the Form 1 `industry_frequency.extras` for the selected frequency (only used when loaded). */
  frequencyFormAllowExtraIds: string[];
};

/**
 * Build a map of variable category → current selection for extra dependency checks.
 * Mirrors FrequencyAwareServiceCard `getVariableCategoryValue` / AddBookingForm `categoryValues`.
 */
export function buildCategoryValuesMapForExtraDeps(
  customization: {
    variableCategories?: Record<string, string>;
    squareMeters?: string;
    bedroom?: string;
    bathroom?: string;
  },
  categoryKeys: string[],
): Record<string, string> {
  const out: Record<string, string> = { ...(customization.variableCategories || {}) };
  for (const categoryName of categoryKeys) {
    const fromCategories = customization.variableCategories?.[categoryName];
    if (fromCategories !== undefined && fromCategories !== null && String(fromCategories).trim() !== '') {
      out[categoryName] = String(fromCategories).trim();
      continue;
    }
    const lowerCategory = categoryName.toLowerCase();
    if (lowerCategory.includes('sqft') || lowerCategory.includes('area') || lowerCategory.includes('square')) {
      out[categoryName] = customization.squareMeters?.trim() || 'None';
    } else if (lowerCategory.includes('bedroom')) {
      out[categoryName] = customization.bedroom?.trim() || 'None';
    } else if (lowerCategory.includes('bathroom')) {
      out[categoryName] = customization.bathroom?.trim() || 'None';
    } else if (!out[categoryName]) {
      out[categoryName] = 'None';
    }
  }
  return out;
}

function freqMatches(selected: string, option: string): boolean {
  const a = String(selected || '').trim();
  const b = String(option || '').trim();
  if (!a || !b) return false;
  return normalizeFrequencyLabelForMatch(a) === normalizeFrequencyLabelForMatch(b);
}

/**
 * Whether an industry extra should appear for the current booking selections.
 * - Form 1 frequency `extras` list only restricts extras that have `show_based_on_frequency` enabled.
 * - Each dependency toggle, when on, must be satisfied (frequency_options, service_category_options, variable_options).
 */
export function industryExtraPassesBookingDependencyRules(
  extra: IndustryExtraDependencyRow,
  ctx: IndustryExtraDependencyContext,
): boolean {
  const freqScoped = Boolean(extra.show_based_on_frequency);

  if (ctx.serviceCategoryUsesFrequencyDeps) {
    if (!ctx.frequencyDepsLoaded) {
      if (freqScoped) return false;
    } else {
      const allow = ctx.frequencyFormAllowExtraIds;
      if (freqScoped && !allow.includes(String(extra.id))) {
        return false;
      }
    }
  }

  if (freqScoped) {
    const opts = Array.isArray(extra.frequency_options) ? extra.frequency_options : [];
    if (opts.length === 0) return false;
    if (!opts.some((o) => freqMatches(ctx.selectedFrequency, String(o)))) {
      return false;
    }
  }

  if (extra.show_based_on_service_category) {
    const opts = Array.isArray(extra.service_category_options) ? extra.service_category_options : [];
    if (opts.length === 0) return false;
    const name = String(ctx.selectedServiceCategoryName || '').trim();
    const id = String(ctx.selectedServiceCategoryId || '').trim();
    const hit = opts.some((o) => {
      const t = String(o).trim();
      return t === name || (id.length > 0 && t === id);
    });
    if (!hit) return false;
  }

  if (extra.show_based_on_variables) {
    const opts = Array.isArray(extra.variable_options) ? extra.variable_options : [];
    if (opts.length === 0) return false;
    const anyMatch = opts.some((token) => {
      const s = String(token);
      const idx = s.indexOf(':');
      if (idx < 0) return false;
      const cat = s.slice(0, idx).trim();
      const paramName = s.slice(idx + 1).trim();
      if (!cat || !paramName) return false;
      const sel = String(ctx.categoryValues[cat] ?? '').trim();
      if (!sel || sel.toLowerCase() === 'none') return false;
      return sel === paramName;
    });
    if (!anyMatch) return false;
  }

  return true;
}
