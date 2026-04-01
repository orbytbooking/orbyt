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
  tax: number;
  total: number;
  lineSubtotal?: number;
  discountedSubtotal?: number;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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
  const tax = num(o.tax);
  const total = num(o.total);
  const lineSubtotal = num(o.line_subtotal ?? o.lineSubtotal);
  const discountedSubtotal = num(o.discounted_subtotal ?? o.discountedSubtotal);
  return {
    effectiveServiceTotal,
    extrasSubtotal,
    partialCleaningDiscount,
    frequencyDiscount,
    couponDiscount,
    tax,
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
  tax: number;
  total: number;
  lineSubtotal: number;
  discountedSubtotal: number;
}): Record<string, number> {
  return {
    effective_service_total: tot.effectiveServiceTotal,
    extras_subtotal: tot.extrasSubtotal,
    partial_cleaning_discount: tot.partialCleaningDiscount,
    frequency_discount: tot.frequencyDiscount,
    coupon_discount: tot.couponDiscount,
    tax: tot.tax,
    total: tot.total,
    line_subtotal: tot.lineSubtotal,
    discounted_subtotal: tot.discountedSubtotal,
  };
}
