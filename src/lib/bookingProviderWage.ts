const VALID_TYPES = ['percentage', 'fixed', 'hourly'] as const;
export type ProviderWageType = (typeof VALID_TYPES)[number];

export type StoreDefaultProviderWage = {
  default_provider_wage: number | string | null;
  default_provider_wage_type: string | null;
} | null;

/**
 * Prefer explicit body fields; otherwise use business_store_options defaults.
 * Used for guest + authenticated customer booking creates.
 */
export function resolveProviderWageFromBodyOrStoreDefault(
  body: Record<string, unknown>,
  storeRow: StoreDefaultProviderWage
): { provider_wage: number; provider_wage_type: ProviderWageType } | undefined {
  const rawW = body.provider_wage ?? body.providerWage;
  const rawT = body.provider_wage_type ?? body.providerWageType;
  if (rawW != null && rawT != null && String(rawT).trim()) {
    const w = typeof rawW === 'number' ? rawW : parseFloat(String(rawW));
    const t = String(rawT).trim().toLowerCase();
    if (Number.isFinite(w) && w > 0 && (VALID_TYPES as readonly string[]).includes(t)) {
      return { provider_wage: w, provider_wage_type: t as ProviderWageType };
    }
  }
  if (!storeRow) return undefined;
  const dw = storeRow.default_provider_wage != null ? Number(storeRow.default_provider_wage) : NaN;
  const dt = (storeRow.default_provider_wage_type || '').toString().trim().toLowerCase();
  if (!Number.isFinite(dw) || dw <= 0) return undefined;
  if (!(VALID_TYPES as readonly string[]).includes(dt)) return undefined;
  return { provider_wage: dw, provider_wage_type: dt as ProviderWageType };
}

/** Hours for hourly wage math: prefer duration_minutes, then notes, else 1. */
export function hoursForHourlyProviderPay(booking: { duration_minutes?: number | null; notes?: string | null }): number {
  const dm = booking.duration_minutes != null ? Number(booking.duration_minutes) : NaN;
  if (Number.isFinite(dm) && dm > 0) return Math.max(dm / 60, 1 / 60);
  const durationMatch = booking.notes?.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)\b/i);
  if (durationMatch) {
    const h = parseFloat(durationMatch[1]);
    if (Number.isFinite(h) && h > 0) return h;
  }
  return 1;
}

/**
 * Estimated provider pay for a booking (matches admin earnings logic for booking-level wage).
 */
export function computeProviderNetPayFromBooking(booking: {
  total_price?: number | string | null;
  amount?: number | string | null;
  provider_wage?: number | string | null;
  provider_wage_type?: string | null;
  duration_minutes?: number | null;
  notes?: string | null;
}): number | null {
  const gross = Number(booking.total_price ?? booking.amount ?? 0);
  if (!Number.isFinite(gross) || gross <= 0) return null;
  const w = booking.provider_wage != null ? Number(booking.provider_wage) : NaN;
  const t = (booking.provider_wage_type || "").toString().trim().toLowerCase();
  if (!Number.isFinite(w) || w < 0 || !t) return null;

  if (t === "percentage") {
    return +(gross * (w / 100)).toFixed(2);
  }
  if (t === "fixed") {
    return +w.toFixed(2);
  }
  if (t === "hourly") {
    const hours = hoursForHourlyProviderPay({
      duration_minutes: booking.duration_minutes,
      notes: booking.notes,
    });
    return +(w * hours).toFixed(2);
  }
  return null;
}
