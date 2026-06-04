/**
 * Customer portal: line items saved at booking time (book-now) under customization.pricing_summary.
 * Mirrors book-now / admin Payment Summary.
 */

export type CustomerPortalPricingSummary = {
  effectiveServiceTotal: number;
  extrasSubtotal: number;
  partialCleaningDiscount: number;
  frequencyDiscount: number;
  couponDiscount: number;
  giftCardDiscount?: number;
  tax: number;
  taxLabel?: string;
  total: number;
  lineSubtotal?: number;
  discountedSubtotal?: number;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Location ids resolved at checkout (zip/city → service area). Used for per-location tax reporting. */
export function extractMatchedLocationIdsFromCustomization(customization: unknown): string[] {
  if (!customization || typeof customization !== "object" || Array.isArray(customization)) return [];
  const raw = (customization as Record<string, unknown>).matched_location_ids;
  if (!Array.isArray(raw)) return [];
  return raw.map((id) => String(id).trim()).filter(Boolean);
}

/** Read snake_case or camelCase pricing_summary from booking.customization JSON. */
export function extractPricingSummaryFromCustomization(
  customization: unknown,
): CustomerPortalPricingSummary | undefined {
  if (!customization || typeof customization !== "object" || Array.isArray(customization)) return undefined;
  const raw = (customization as Record<string, unknown>).pricing_summary;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const hasShape =
    "total" in o ||
    "effective_service_total" in o ||
    "effectiveServiceTotal" in o;
  if (!hasShape) return undefined;
  const effectiveServiceTotal = num(o.effective_service_total ?? o.effectiveServiceTotal);
  const extrasSubtotal = num(o.extras_subtotal ?? o.extrasSubtotal);
  const partialCleaningDiscount = num(o.partial_cleaning_discount ?? o.partialCleaningDiscount);
  const frequencyDiscount = num(o.frequency_discount ?? o.frequencyDiscount);
  const couponDiscount = num(o.coupon_discount ?? o.couponDiscount);
  const giftCardDiscount = num(o.gift_card_discount ?? o.giftCardDiscount);
  const tax = num(o.tax);
  const taxLabelRaw = o.tax_label ?? o.taxLabel;
  const taxLabel =
    typeof taxLabelRaw === "string" && taxLabelRaw.trim() ? taxLabelRaw.trim() : undefined;
  const total = num(o.total);
  const lineSubtotal = num(o.line_subtotal ?? o.lineSubtotal);
  const discountedSubtotal = num(o.discounted_subtotal ?? o.discountedSubtotal);
  return {
    effectiveServiceTotal,
    extrasSubtotal,
    partialCleaningDiscount,
    frequencyDiscount,
    couponDiscount,
    ...(giftCardDiscount > 0 ? { giftCardDiscount } : {}),
    tax,
    ...(taxLabel ? { taxLabel } : {}),
    total,
    ...(lineSubtotal > 0 ? { lineSubtotal } : {}),
    ...(discountedSubtotal > 0 ? { discountedSubtotal } : {}),
  };
}

/** Persist under customization.pricing_summary (snake_case for JSON/API). */
export function serializePricingSummaryForCustomization(tot: {
  effectiveServiceTotal: number;
  extrasSubtotal: number;
  partialCleaningDiscount: number;
  frequencyDiscount: number;
  couponDiscount: number;
  giftCardDiscount?: number;
  tax: number;
  taxLabel?: string;
  total: number;
  lineSubtotal: number;
  discountedSubtotal: number;
}): Record<string, number | string> {
  return {
    effective_service_total: tot.effectiveServiceTotal,
    extras_subtotal: tot.extrasSubtotal,
    partial_cleaning_discount: tot.partialCleaningDiscount,
    frequency_discount: tot.frequencyDiscount,
    coupon_discount: tot.couponDiscount,
    ...(tot.giftCardDiscount != null && tot.giftCardDiscount > 0
      ? { gift_card_discount: tot.giftCardDiscount }
      : {}),
    tax: tot.tax,
    ...(tot.taxLabel ? { tax_label: tot.taxLabel } : {}),
    total: tot.total,
    line_subtotal: tot.lineSubtotal,
    discounted_subtotal: tot.discountedSubtotal,
  };
}
