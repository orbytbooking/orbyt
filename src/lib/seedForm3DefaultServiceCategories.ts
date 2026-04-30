import type { SupabaseClient } from "@supabase/supabase-js";
import { FORM1_DEFAULT_ALL_FREQUENCY_NAMES } from "@/lib/form1DefaultServiceCategoryConfig";
import { requireIndustryBelongsToBusiness } from "@/lib/industryTenantGuard";

/** Single starter category for Form 3 (items + add-ons flow); admin can rename or add more. */
const FORM3_DEFAULT_SERVICE_CATEGORIES: ReadonlyArray<{ name: string; sort_order: number }> = [
  { name: "Services", sort_order: 0 },
];

export async function seedForm3DefaultServiceCategoriesIfEmpty(
  supabase: SupabaseClient,
  businessId: string,
  industryId: string,
): Promise<{ applied: boolean; skipped?: boolean; error?: string }> {
  try {
    const tenant = await requireIndustryBelongsToBusiness(supabase, businessId, industryId);
    if (!tenant.ok) {
      return { applied: false, error: "error" in tenant ? tenant.error : "Industry tenant check failed" };
    }

    const { count, error: cErr } = await supabase
      .from("industry_form3_service_categories")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("industry_id", industryId)
      .eq("booking_form_scope", "form3");

    if (cErr) {
      return { applied: false, error: cErr.message };
    }
    if ((count ?? 0) > 0) {
      return { applied: false, skipped: true };
    }

    const selected = [...FORM1_DEFAULT_ALL_FREQUENCY_NAMES];
    const variables: Record<string, string[]> = {};

    for (const row of FORM3_DEFAULT_SERVICE_CATEGORIES) {
      const { error: insErr } = await supabase.from("industry_form3_service_categories").insert({
        business_id: businessId,
        industry_id: industryId,
        booking_form_scope: "form3",
        name: row.name,
        display: "customer_frontend_backend_admin",
        service_category_frequency: true,
        selected_frequencies: selected,
        variables,
        sort_order: row.sort_order,
      });
      if (insErr) {
        return { applied: false, error: insErr.message };
      }
    }

    return { applied: true };
  } catch (e) {
    return { applied: false, error: e instanceof Error ? e.message : "seed failed" };
  }
}
