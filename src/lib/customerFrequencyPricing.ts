/**
 * Customer-facing booking totals aligned with admin AddBookingForm:
 * partial cleaning discount → recurring frequency discount → coupon → tax.
 */

/** Match book-now / admin fallback when variable+extras are both zero. */
export function computeEffectiveServiceAndExtras(args: {
  variableSubtotal: number;
  extrasSubtotal: number;
  fallbackServicePrice: number;
  selectedServiceListPrice?: number;
}): { effectiveServiceTotal: number; extrasSubtotal: number } {
  let effectiveServiceTotal = args.variableSubtotal;
  const { extrasSubtotal, fallbackServicePrice, selectedServiceListPrice } = args;
  if (effectiveServiceTotal === 0 && extrasSubtotal === 0) {
    effectiveServiceTotal = fallbackServicePrice;
  }
  if (effectiveServiceTotal === 0 && extrasSubtotal === 0 && selectedServiceListPrice != null && selectedServiceListPrice > 0) {
    effectiveServiceTotal = selectedServiceListPrice;
  }
  return { effectiveServiceTotal, extrasSubtotal };
}

export type CustomerFrequencyMeta = {
  frequency_repeats?: string;
  occurrence_time?: string;
  discount?: number;
  discount_type?: string;
  frequency_discount?: string;
  shorter_job_length?: string;
  shorter_job_length_by?: string;
  exclude_first_appointment?: boolean;
  /** Popup-on-selection (industry_frequency) */
  enable_popup?: boolean;
  popup_content?: string | null;
  popup_display?: string | null;
};

export function computePartialCleaningDiscount(
  isPartialCleaning: boolean,
  excludedAreas: string[] | undefined,
  excludeQuantities: Record<string, number> | undefined,
  excludeParameters: Array<{ name: string; price?: number; qty_based?: boolean }>,
): number {
  if (!isPartialCleaning || !excludedAreas?.length) return 0;
  let discount = 0;
  for (const areaName of excludedAreas) {
    const param = excludeParameters.find((p) => p.name === areaName);
    if (param && typeof param.price === 'number' && param.price > 0) {
      const qty = param.qty_based ? Math.max(1, excludeQuantities?.[areaName] ?? 1) : 1;
      discount += param.price * qty;
    }
  }
  return discount;
}

/** Mirrors AddBookingForm calculateFrequencyDiscount. */
export function computeFrequencyDiscountAmount(args: {
  freqMeta: CustomerFrequencyMeta | null | undefined;
  effectiveServiceTotal: number;
  extrasTotal: number;
  partialCleaningDiscount: number;
  /** New portal booking = first visit in the series */
  isFirstAppointment: boolean;
}): number {
  const { freqMeta, effectiveServiceTotal, extrasTotal, partialCleaningDiscount, isFirstAppointment } = args;
  if (!freqMeta) return 0;
  const raw = freqMeta.discount;
  if (raw == null || Number.isNaN(Number(raw))) return 0;
  const discountNum = Number(raw);
  if (discountNum <= 0) return 0;

  if (freqMeta.occurrence_time === 'recurring') {
    if (freqMeta.frequency_discount === 'exclude-first' && isFirstAppointment) {
      return 0;
    }
  }

  const subtotal = effectiveServiceTotal + extrasTotal - partialCleaningDiscount;
  if (subtotal <= 0) return 0;

  const discountType = (freqMeta.discount_type ?? '%').toString();
  if (discountType === '%' || discountType.toLowerCase() === 'percentage') {
    return (subtotal * discountNum) / 100;
  }
  return Math.min(subtotal, discountNum);
}

export function computeCustomerBookingTotals(args: {
  effectiveServiceTotal: number;
  extrasSubtotal: number;
  partialCleaningDiscount: number;
  frequencyDiscount: number;
  taxRate: number;
  getCouponDiscountAmount: (baseAfterIndustryDiscounts: number) => number;
}): {
  lineSubtotal: number;
  partialCleaningDiscount: number;
  frequencyDiscount: number;
  baseBeforeCoupon: number;
  couponDiscount: number;
  discountedSubtotal: number;
  tax: number;
  total: number;
} {
  const {
    effectiveServiceTotal,
    extrasSubtotal,
    partialCleaningDiscount,
    frequencyDiscount,
    taxRate,
    getCouponDiscountAmount,
  } = args;

  const lineSubtotal = effectiveServiceTotal + extrasSubtotal;
  const baseBeforeCoupon = Math.max(0, lineSubtotal - partialCleaningDiscount - frequencyDiscount);
  const couponDiscount = getCouponDiscountAmount(baseBeforeCoupon);
  const discountedSubtotal = Math.max(0, baseBeforeCoupon - couponDiscount);
  const tax = discountedSubtotal * taxRate;
  const total = discountedSubtotal + tax;

  return {
    lineSubtotal,
    partialCleaningDiscount,
    frequencyDiscount,
    baseBeforeCoupon,
    couponDiscount,
    discountedSubtotal,
    tax,
    total,
  };
}
