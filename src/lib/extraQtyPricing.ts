export type ManualPriceTier = { price?: number; time_minutes?: number };

export type ExtraQtyPricingInput = {
  qty_based?: boolean | null;
  pricing_structure?: string | null;
  price: number;
  time_minutes: number;
  maximum_quantity?: number | null;
  manual_prices?: ManualPriceTier[] | null;
};

/**
 * Resolves total line price and duration minutes for an industry extra at a given quantity.
 * - Non–qty-based: single unit (quantity ignored for price/time).
 * - multiply: per-unit price and time_minutes × quantity (capped by maximum_quantity when set).
 * - manual: tier at index min(qty, max) - 1 from manual_prices; falls back to multiply if no tiers.
 */
export function resolveQtyBasedExtraLine(
  extra: ExtraQtyPricingInput,
  quantity: number,
): { linePrice: number; lineMinutes: number } {
  const qRaw = Math.floor(Number(quantity)) || 0;
  if (!extra.qty_based) {
    return {
      linePrice: Math.max(0, Number(extra.price) || 0),
      lineMinutes: Math.max(0, Number(extra.time_minutes) || 0),
    };
  }
  const qty = Math.max(1, qRaw);
  const maxQ =
    extra.maximum_quantity != null && extra.maximum_quantity > 0
      ? Math.min(qty, extra.maximum_quantity)
      : qty;
  const structure = String(extra.pricing_structure || 'multiply').toLowerCase();
  const tiers = Array.isArray(extra.manual_prices) ? extra.manual_prices : [];
  if (structure === 'manual' && tiers.length > 0) {
    const idx = Math.min(maxQ - 1, tiers.length - 1);
    const tier = tiers[idx];
    return {
      linePrice: Math.max(0, Number(tier?.price ?? 0)),
      lineMinutes: Math.max(0, Number(tier?.time_minutes ?? 0)),
    };
  }
  const unitPrice = Number(extra.price) || 0;
  const unitMin = Number(extra.time_minutes) || 0;
  return {
    linePrice: unitPrice * maxQ,
    lineMinutes: unitMin * maxQ,
  };
}
