import type { ServiceCustomization } from "@/components/FrequencyAwareServiceCard";
import {
  frequencyDepOptionNamesForCategory,
  type FrequencyDependencies,
} from "@/lib/frequencyFilter";
import {
  pricingParamAppliesToSelection,
  type PricingParamRow,
} from "@/lib/pricingParameterVisibility";
import { resolveQtyBasedExtraLine } from "@/lib/extraQtyPricing";
import { approximateMinutesFromDurationLabel } from "@/lib/bookingDuration";

export type ExcludeParamForDuration = {
  name: string;
  time_minutes?: number;
  qty_based?: boolean;
};

/**
 * Same rules as admin AddBookingForm / book-now: sum pricing-parameter time_minutes + extras,
 * subtract partial-cleaning excludes, then fallback to parsing a duration label (e.g. "4-6 hours").
 */
export function estimateBookingDurationMinutes(args: {
  serviceName: string;
  customization: ServiceCustomization;
  pricingParametersFull: PricingParamRow[];
  availableExtras: unknown[];
  excludeParametersList: ExcludeParamForDuration[];
  durationLabelFallback?: string | null;
  /** When the service category uses Form 1 frequency dependencies, restrict counted variables. */
  frequencyDependencies?: FrequencyDependencies | null;
  serviceUsesFrequencyVariableDeps?: boolean;
}): number | null {
  const {
    serviceName,
    customization,
    pricingParametersFull,
    availableExtras,
    excludeParametersList,
    durationLabelFallback,
    frequencyDependencies,
    serviceUsesFrequencyVariableDeps,
  } = args;

  const selectedFrequency = customization.frequency?.trim() || "One-time";

  let totalMinutes = 0;
  const vc = customization.variableCategories ?? {};
  let addedAreaLike = false;

  if (pricingParametersFull.length > 0) {
    for (const [categoryKey, optionName] of Object.entries(vc)) {
      if (!optionName?.trim() || optionName.trim().toLowerCase() === "none") continue;
      if (serviceUsesFrequencyVariableDeps && frequencyDependencies) {
        const allowed = frequencyDepOptionNamesForCategory(categoryKey, frequencyDependencies);
        if (allowed !== null && !allowed.includes(optionName.trim())) continue;
      }
      const param = pricingParametersFull.find(
        (p) =>
          String(p.variable_category ?? "").trim() === categoryKey &&
          String(p.name ?? "").trim() === optionName.trim() &&
          pricingParamAppliesToSelection(
            {
              show_based_on_frequency: p.show_based_on_frequency,
              frequency: p.frequency,
              show_based_on_service_category: p.show_based_on_service_category,
              service_category: p.service_category,
            },
            selectedFrequency,
            serviceName,
          ),
      );
      if (param && typeof param.time_minutes === "number" && param.time_minutes > 0) {
        totalMinutes += param.time_minutes;
        if (/sqft|area|square|meter|size/i.test(String(param.variable_category))) addedAreaLike = true;
      }
    }

    if (!addedAreaLike && customization.squareMeters?.trim()) {
      const sqName = customization.squareMeters.trim();
      let allowSq = true;
      if (serviceUsesFrequencyVariableDeps && frequencyDependencies) {
        const catKey =
          pricingParametersFull.find((p) =>
            /sqft|area|square|meter|size/i.test(String(p.variable_category ?? "")),
          )?.variable_category ?? "Sq Ft";
        const allowed = frequencyDepOptionNamesForCategory(String(catKey), frequencyDependencies);
        if (allowed !== null && !allowed.includes(sqName)) allowSq = false;
      }
      if (allowSq) {
        const areaLikeParam = pricingParametersFull.find(
          (p) =>
            /sqft|area|square|meter|size/i.test(String(p.variable_category ?? "")) &&
            String(p.name ?? "").trim() === sqName &&
            pricingParamAppliesToSelection(
              {
                show_based_on_frequency: p.show_based_on_frequency,
                frequency: p.frequency,
                show_based_on_service_category: p.show_based_on_service_category,
                service_category: p.service_category,
              },
              selectedFrequency,
              serviceName,
            ),
        );
        if (areaLikeParam && typeof areaLikeParam.time_minutes === "number" && areaLikeParam.time_minutes > 0) {
          totalMinutes += areaLikeParam.time_minutes;
        }
      }
    }
  }

  if (customization.extras?.length && availableExtras.length > 0) {
    for (const item of customization.extras) {
      if (item.name === "None") continue;
      const extra = availableExtras.find(
        (e: { name?: string }) => (e.name || "").trim() === (item.name || "").trim(),
      );
      if (!extra) continue;
      const qty = Math.max(1, Number(item.quantity) || 1);
      const { lineMinutes } = resolveQtyBasedExtraLine(
        {
          qty_based: (extra as { qty_based?: boolean }).qty_based,
          pricing_structure: (extra as { pricing_structure?: string }).pricing_structure,
          price: Number((extra as { price?: unknown }).price) || 0,
          time_minutes: Number((extra as { time_minutes?: unknown }).time_minutes) || 0,
          maximum_quantity: (extra as { maximum_quantity?: number | null }).maximum_quantity ?? null,
          manual_prices: (extra as { manual_prices?: { price?: number; time_minutes?: number }[] }).manual_prices ?? null,
        },
        qty,
      );
      if (lineMinutes > 0) totalMinutes += lineMinutes;
    }
  }

  if (customization.isPartialCleaning && customization.excludedAreas?.length) {
    for (const areaName of customization.excludedAreas) {
      const param = excludeParametersList.find((p) => p.name === areaName);
      const tm = param?.time_minutes;
      if (typeof tm === "number" && tm > 0) {
        const qty = param.qty_based ? Math.max(1, customization.excludeQuantities?.[areaName] ?? 1) : 1;
        totalMinutes -= tm * qty;
      }
    }
    totalMinutes = Math.max(0, totalMinutes);
  }

  if (totalMinutes > 0) return totalMinutes;

  return approximateMinutesFromDurationLabel(durationLabelFallback);
}
