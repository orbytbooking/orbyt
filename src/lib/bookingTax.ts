/**
 * Business tax settings for checkout and booking creation.
 * Admin UI: Settings → General → Taxes (business_tax_settings.settings JSON).
 */

export type TaxMethod = 'taxify' | 'flat';

export interface TaxSettingsPayload {
  taxesEnabled?: boolean;
  method?: TaxMethod;
  taxLabel?: string;
  taxifyApiKey?: string | null;
  flatLocationMode?: 'single' | 'per_location';
  /** Percentage as string, e.g. "8.25" */
  flatRateGlobal?: string;
  flatTaxAmountPerLocation?: Record<string, string>;
}

/** Safe subset exposed to anonymous book-now (no API keys). */
export type PublicBookingTaxSettings = {
  taxesEnabled: boolean;
  method: TaxMethod;
  taxLabel: string;
  flatLocationMode: 'single' | 'per_location';
  flatRateGlobal: string | null;
  flatTaxAmountPerLocation: Record<string, string>;
};

export type BookingTaxConfig = {
  taxesEnabled: boolean;
  /** Multiplier on pre-tax subtotal (e.g. 0.0825 for 8.25%). */
  rateDecimal: number;
  label: string;
};

function parsePercent(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function normalizeTaxSettings(raw: unknown): TaxSettingsPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as TaxSettingsPayload;
}

export function toPublicBookingTaxSettings(settings: TaxSettingsPayload): PublicBookingTaxSettings {
  const method: TaxMethod = settings.method === 'flat' ? 'flat' : 'taxify';
  const flatLocationMode: 'single' | 'per_location' =
    settings.flatLocationMode === 'per_location' ? 'per_location' : 'single';
  const flatRateGlobal = parsePercent(settings.flatRateGlobal);
  const flatTaxAmountPerLocation: Record<string, string> = {};
  if (settings.flatTaxAmountPerLocation && typeof settings.flatTaxAmountPerLocation === 'object') {
    for (const [k, v] of Object.entries(settings.flatTaxAmountPerLocation)) {
      const p = parsePercent(v);
      if (k && p != null) flatTaxAmountPerLocation[k] = String(p);
    }
  }
  return {
    taxesEnabled: !!settings.taxesEnabled,
    method,
    taxLabel: typeof settings.taxLabel === 'string' && settings.taxLabel.trim() ? settings.taxLabel.trim() : 'Tax',
    flatLocationMode,
    flatRateGlobal: flatRateGlobal != null ? String(flatRateGlobal) : null,
    flatTaxAmountPerLocation,
  };
}

/** Resolve flat tax percentage from settings and optional matched service-area location ids. */
export function resolveFlatTaxPercent(
  settings: TaxSettingsPayload,
  matchedLocationIds?: string[],
): number | null {
  const mode = settings.flatLocationMode === 'per_location' ? 'per_location' : 'single';
  if (mode === 'per_location') {
    const map = settings.flatTaxAmountPerLocation;
    if (!map || typeof map !== 'object') return null;
    const ids = matchedLocationIds?.filter(Boolean) ?? [];
    for (const id of ids) {
      const p = parsePercent(map[id]);
      if (p != null && p > 0) return p;
    }
    return null;
  }
  return parsePercent(settings.flatRateGlobal);
}

/**
 * Checkout tax config: flat rate from admin settings; Taxify returns 0 until integrated.
 */
export function resolveBookingTaxConfig(
  settings: TaxSettingsPayload | null | undefined,
  matchedLocationIds?: string[],
): BookingTaxConfig {
  const label =
    typeof settings?.taxLabel === 'string' && settings.taxLabel.trim()
      ? settings.taxLabel.trim()
      : 'Tax';

  if (!settings?.taxesEnabled) {
    return { taxesEnabled: false, rateDecimal: 0, label };
  }

  if (settings.method !== 'flat') {
    return { taxesEnabled: true, rateDecimal: 0, label };
  }

  const percent = resolveFlatTaxPercent(settings, matchedLocationIds);
  if (percent == null || percent <= 0) {
    return { taxesEnabled: true, rateDecimal: 0, label };
  }

  return { taxesEnabled: true, rateDecimal: percent / 100, label };
}

export function computeTaxOnSubtotal(preTaxSubtotal: number, rateDecimal: number): number {
  if (preTaxSubtotal <= 0 || rateDecimal <= 0) return 0;
  return +(preTaxSubtotal * rateDecimal).toFixed(2);
}

/** Minimal supabase client shape for business_tax_settings lookup. */
type TaxSettingsSupabaseClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data?: { settings?: unknown } | null }>;
      };
    };
  };
};

/** Load business tax settings and compute pre-tax / tax / total for admin booking APIs. */
export async function resolveBookingTaxTotals(
  supabase: TaxSettingsSupabaseClient,
  businessId: string,
  preTaxAmount: number,
  matchedLocationIds?: string[],
): Promise<{ preTaxAmount: number; taxAmount: number; totalWithTax: number }> {
  const preTax = Math.max(0, Number(preTaxAmount) || 0);
  let taxAmount = 0;
  try {
    const { data: taxRow } = await supabase
      .from('business_tax_settings')
      .select('settings')
      .eq('business_id', businessId)
      .maybeSingle();
    const taxConfig = resolveBookingTaxConfig(normalizeTaxSettings(taxRow?.settings), matchedLocationIds);
    taxAmount = computeTaxOnSubtotal(preTax, taxConfig.rateDecimal);
  } catch {
    // keep tax at 0
  }
  return { preTaxAmount: preTax, taxAmount, totalWithTax: +(preTax + taxAmount).toFixed(2) };
}
