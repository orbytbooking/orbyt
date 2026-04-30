import type { BookingFormScope } from "@/lib/bookingFormScope";
import type { IndustryExtraListingKind } from "@/lib/bookingFormScope";

export function scopedIndustryTable(
  baseTable:
    | "industry_frequency"
    | "industry_service_category"
    | "industry_pricing_variable"
    | "industry_pricing_parameter"
    | "industry_extras",
  scope: BookingFormScope | null | undefined,
  opts?: { listingKind?: IndustryExtraListingKind | null },
): string {
  if (scope === "form2") {
    if (baseTable === "industry_frequency") return "industry_form2_frequencies";
    if (baseTable === "industry_service_category") return "industry_form2_service_categories";
    if (baseTable === "industry_pricing_variable") return "industry_form2_items";
    if (baseTable === "industry_pricing_parameter") return "industry_form2_packages";
    if (opts?.listingKind === "addon") return "industry_form2_addons";
    return "industry_form2_extras";
  }
  if (scope === "form3") {
    if (baseTable === "industry_frequency") return "industry_form3_frequencies";
    if (baseTable === "industry_service_category") return "industry_form3_service_categories";
    if (baseTable === "industry_pricing_variable") return "industry_form3_items";
    // Form 3 uses items + add-ons; pricing parameters are not used.
    if (baseTable === "industry_pricing_parameter") return "industry_pricing_parameter";
    if (opts?.listingKind === "addon") return "industry_form3_addons";
    return "industry_form3_extras";
  }
  if (scope === "form4") {
    if (baseTable === "industry_frequency") return "industry_form4_frequencies";
    if (baseTable === "industry_service_category") return "industry_form4_service_categories";
    if (baseTable === "industry_pricing_variable") return "industry_form4_variables";
    if (baseTable === "industry_pricing_parameter") return "industry_form4_pricing_parameters";
    // Form 4 has extras but no add-on split table.
    return "industry_form4_extras";
  }
  return baseTable;
}

