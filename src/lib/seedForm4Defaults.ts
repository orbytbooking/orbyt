import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeFrequencyPopupDisplay } from "@/lib/frequencyPopupDisplay";
import { requireIndustryBelongsToBusiness } from "@/lib/industryTenantGuard";
import { scopedIndustryTable } from "@/lib/formScopeTables";

const POPUP = normalizeFrequencyPopupDisplay("customer_frontend_backend_admin");

/** Starter frequencies aligned with BookingKoala-style recurring presets. */
const FORM4_DEFAULT_FREQUENCY_ROWS: Array<{
  name: string;
  occurrence_time: "onetime" | "recurring";
  discount: number;
  is_default: boolean;
  frequency_repeats: string | null;
  shorter_job_length: string;
  shorter_job_length_by: string;
  frequency_discount: string;
}> = [
  {
    name: "2x per week",
    occurrence_time: "recurring",
    discount: 0,
    is_default: false,
    frequency_repeats: "every-mon-fri",
    shorter_job_length: "no",
    shorter_job_length_by: "0",
    frequency_discount: "all",
  },
  {
    name: "3x per week",
    occurrence_time: "recurring",
    discount: 0,
    is_default: false,
    frequency_repeats: "every-mon-wed-fri",
    shorter_job_length: "no",
    shorter_job_length_by: "0",
    frequency_discount: "all",
  },
  {
    name: "Daily 5x per week",
    occurrence_time: "recurring",
    discount: 10,
    is_default: false,
    frequency_repeats: "daily-no-sat-sun",
    shorter_job_length: "no",
    shorter_job_length_by: "0",
    frequency_discount: "all",
  },
  {
    name: "One-Time",
    occurrence_time: "onetime",
    discount: 0,
    is_default: true,
    frequency_repeats: null,
    shorter_job_length: "no",
    shorter_job_length_by: "0",
    frequency_discount: "all",
  },
  {
    name: "Weekly",
    occurrence_time: "recurring",
    discount: 15,
    is_default: false,
    frequency_repeats: "every-week",
    shorter_job_length: "no",
    shorter_job_length_by: "0",
    frequency_discount: "all",
  },
  {
    name: "Every Other Week",
    occurrence_time: "recurring",
    discount: 10,
    is_default: false,
    frequency_repeats: "every-2-weeks",
    shorter_job_length: "no",
    shorter_job_length_by: "0",
    frequency_discount: "all",
  },
  {
    name: "Monthly",
    occurrence_time: "recurring",
    discount: 5,
    is_default: false,
    frequency_repeats: "every-4-weeks",
    shorter_job_length: "no",
    shorter_job_length_by: "0",
    frequency_discount: "all",
  },
];

function form4IndustryDefaults(industryName: string): {
  serviceCategoryName: string;
  variableCategory: string;
  pricingParameterName: string;
  unitLabel: string;
  price: number;
  timeMinutes: number;
  extras: Array<{ name: string; price: number; time_minutes: number }>;
} {
  const raw = industryName.trim();
  // Canonical Form 4 starter defaults from your reference.
  return {
    serviceCategoryName: raw || "Pool Cleaning",
    variableCategory: "Square Footage",
    pricingParameterName: "Square Footage",
    unitLabel: "Square Footage",
    price: 0.08,
    timeMinutes: 65,
    extras: [
      { name: "Drain Pool", price: 300, time_minutes: 840 },
      { name: "Drain Pool & Remove Stains", price: 800, time_minutes: 960 },
      { name: "Open and Close Pool", price: 150, time_minutes: 180 },
    ],
  };
}

/**
 * Seeds minimal Form 4 catalog rows when an industry is created or switched to Form 4:
 * frequencies, one service category, one unit-priced pricing parameter (per BookingKoala Form 4 guidance).
 */
export async function seedForm4DefaultsIfEmpty(
  supabase: SupabaseClient,
  businessId: string,
  industryId: string,
  opts?: { bookingFormScope?: "form4" | "form5"; seedExtras?: boolean },
): Promise<{ applied: boolean; skipped?: boolean; error?: string }> {
  try {
    const bookingFormScope = opts?.bookingFormScope === "form5" ? "form5" : "form4";
    const shouldSeedExtras = opts?.seedExtras ?? true;
    const isForm5Scope = bookingFormScope === "form5";
    const tenant = await requireIndustryBelongsToBusiness(supabase, businessId, industryId);
    if (!tenant.ok) {
      return { applied: false, error: "error" in tenant ? tenant.error : "Industry tenant check failed" };
    }

    const frequencyTable = scopedIndustryTable("industry_frequency", bookingFormScope);
    const serviceCategoryTable = scopedIndustryTable("industry_service_category", bookingFormScope);
    const variableTable = scopedIndustryTable("industry_pricing_variable", bookingFormScope);
    const pricingParameterTable = scopedIndustryTable("industry_pricing_parameter", bookingFormScope);
    const extrasTable = scopedIndustryTable("industry_extras", bookingFormScope);

    const { data: industryRow } = await supabase
      .from("industries")
      .select("name")
      .eq("id", industryId)
      .maybeSingle();
    const industryName = String((industryRow as { name?: string } | null)?.name ?? "").trim();
    const defaults = form4IndustryDefaults(industryName);

    const { count: freqCount, error: cErr } = await supabase
      .from(frequencyTable)
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("industry_id", industryId)
      .eq("booking_form_scope", bookingFormScope);

    if (cErr) {
      return { applied: false, error: cErr.message };
    }
    const { count: serviceCatCount, error: scCountErr } = await supabase
      .from(serviceCategoryTable)
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("industry_id", industryId)
      .eq("booking_form_scope", bookingFormScope);
    if (scCountErr) {
      return { applied: false, error: scCountErr.message };
    }

    const { count: pricingCount, error: ppCountErr } = await supabase
      .from(pricingParameterTable)
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("industry_id", industryId)
      .eq("booking_form_scope", bookingFormScope);
    const { count: variableCount, error: varCountErr } = await supabase
      .from(variableTable)
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("industry_id", industryId)
      .eq("booking_form_scope", bookingFormScope);
    if (varCountErr) {
      return { applied: false, error: varCountErr.message };
    }

    if (ppCountErr) {
      return { applied: false, error: ppCountErr.message };
    }

    const { count: extraCount, error: exCountErr } = await supabase
      .from(extrasTable)
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("industry_id", industryId)
      .eq("booking_form_scope", bookingFormScope);
    if (exCountErr) {
      return { applied: false, error: exCountErr.message };
    }

    const needFrequencies = (freqCount ?? 0) === 0;
    const needServiceCategory = (serviceCatCount ?? 0) === 0;
    const needVariable = !isForm5Scope && (variableCount ?? 0) === 0;
    const needPricingParameter = !isForm5Scope && (pricingCount ?? 0) === 0;
    const needExtras = shouldSeedExtras && (extraCount ?? 0) === 0;
    const anythingMissing =
      needFrequencies || needServiceCategory || needVariable || needPricingParameter || needExtras;
    if (!anythingMissing) {
      return { applied: false, skipped: true };
    }

    const freqRows = FORM4_DEFAULT_FREQUENCY_ROWS.map((fr) => ({
      business_id: businessId,
      industry_id: industryId,
      booking_form_scope: bookingFormScope,
      name: fr.name,
      display: "Both",
      occurrence_time: fr.occurrence_time,
      discount: fr.discount,
      discount_type: "%",
      is_default: fr.is_default,
      popup_display: POPUP,
      frequency_repeats: fr.frequency_repeats,
      shorter_job_length: fr.shorter_job_length,
      shorter_job_length_by: fr.shorter_job_length_by,
      exclude_first_appointment: false,
      frequency_discount: fr.frequency_discount,
      charge_one_time_price: false,
      service_categories: [] as string[],
      bathroom_variables: [] as string[],
      sqft_variables: [] as string[],
      bedroom_variables: [] as string[],
      exclude_parameters: [] as string[],
      extras: [] as string[],
      show_based_on_location: false,
      location_ids: [] as string[],
      is_active: true,
    }));

    if (needFrequencies) {
      const { error: fqErr } = await supabase.from(frequencyTable).insert(freqRows);
      if (fqErr) {
        return { applied: false, error: fqErr.message };
      }
    }

    const selectedFreq = FORM4_DEFAULT_FREQUENCY_ROWS.map((r) => r.name);
    if (needServiceCategory) {
      const { error: catErr } = await supabase.from(serviceCategoryTable).insert({
        business_id: businessId,
        industry_id: industryId,
        booking_form_scope: bookingFormScope,
        name: defaults.serviceCategoryName,
        display: "customer_frontend_backend_admin",
        service_category_frequency: true,
        selected_frequencies: selectedFreq,
        variables: {} as Record<string, string[]>,
        hourly_service: {
          enabled: isForm5Scope,
          price: String(defaults.price),
          currency: "$",
          priceCalculationType: "customTime",
          countExtrasSeparately: true,
        },
        sort_order: 0,
      });
      if (catErr) {
        return { applied: false, error: catErr.message };
      }
    }

    if (needVariable) {
      const { error: varErr } = await supabase.from(variableTable).insert({
        business_id: businessId,
        industry_id: industryId,
        booking_form_scope: bookingFormScope,
        name: defaults.variableCategory,
        category: defaults.variableCategory,
        description: "Form 4 variable preset for unit-based pricing.",
        is_active: true,
        sort_order: 0,
      });
      if (varErr) {
        return { applied: false, error: varErr.message };
      }
    }

    if (needPricingParameter) {
      const freqCsv = FORM4_DEFAULT_FREQUENCY_ROWS.map((r) => r.name).join(", ");
      const { error: ppErr } = await supabase.from(pricingParameterTable).insert({
        business_id: businessId,
        industry_id: industryId,
        booking_form_scope: bookingFormScope,
        name: defaults.pricingParameterName,
        description:
          "Form 4 unit pricing: total price = this rate × quantity entered by the customer; duration uses time_minutes × quantity.",
        variable_category: defaults.variableCategory,
        pricing_variable_id: null,
        price: defaults.price,
        time_minutes: defaults.timeMinutes,
        display: "Customer Frontend, Backend & Admin",
        is_default: true,
        sort_order: 0,
        show_based_on_frequency: true,
        frequency: freqCsv,
        show_based_on_service_category: true,
        service_category: defaults.serviceCategoryName,
        show_based_on_service_category2: false,
        service_category2: null,
        excluded_extras: [],
        excluded_services: [],
        excluded_providers: [],
        exclude_parameters: [],
        quantity_based: true,
        unit_label: defaults.unitLabel,
      });
      if (ppErr) {
        return { applied: false, error: ppErr.message };
      }
    }

    if (needExtras && defaults.extras.length > 0) {
      const extraRows = defaults.extras.map((ex, idx) => ({
        business_id: businessId,
        industry_id: industryId,
        booking_form_scope: bookingFormScope,
        listing_kind: "extra",
        name: ex.name,
        description: null,
        icon: null,
        time_minutes: ex.time_minutes,
        service_category: null,
        price: ex.price,
        display: "frontend-backend-admin",
        qty_based: false,
        maximum_quantity: null,
        pricing_structure: "multiply",
        manual_prices: [],
        exempt_from_discount: false,
        show_based_on_frequency: false,
        frequency_options: [],
        show_based_on_service_category: false,
        service_category_options: [],
        show_based_on_variables: false,
        variable_options: [],
        excluded_providers: [],
        apply_to_all_bookings: true,
        sort_order: idx,
      }));
      const { error: extraErr } = await supabase.from(extrasTable).insert(extraRows);
      if (extraErr) {
        return { applied: false, error: extraErr.message };
      }
    }

    return { applied: true };
  } catch (e) {
    return { applied: false, error: e instanceof Error ? e.message : "seed failed" };
  }
}
