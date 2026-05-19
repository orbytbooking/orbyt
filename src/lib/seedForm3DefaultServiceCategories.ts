import type { SupabaseClient } from "@supabase/supabase-js";
import { FORM1_DEFAULT_ALL_FREQUENCY_NAMES } from "@/lib/form1DefaultServiceCategoryConfig";
import { requireIndustryBelongsToBusiness } from "@/lib/industryTenantGuard";

/** Customer-facing default service category label for Form 3, derived from the industry name. */
export function defaultForm3ServiceCategoryName(industryName: string): string {
  const trimmed = industryName.trim();
  if (!trimmed) return "Services";
  if (trimmed.toLowerCase() === "hair salon") return "Hair salon";
  return trimmed;
}

/** Rename legacy single-row seed ("Services") to the industry-specific default when applicable. */
export async function repairLegacyForm3DefaultServiceCategoryName(
  supabase: SupabaseClient,
  businessId: string,
  industryId: string,
  industryName: string,
): Promise<void> {
  const targetName = defaultForm3ServiceCategoryName(industryName);
  if (targetName === "Services") return;

  const { data: rows, error } = await supabase
    .from("industry_form3_service_categories")
    .select("id, name")
    .eq("business_id", businessId)
    .eq("industry_id", industryId)
    .eq("booking_form_scope", "form3");

  if (error || !rows || rows.length !== 1) return;
  if (String(rows[0].name ?? "").trim() !== "Services") return;

  await supabase
    .from("industry_form3_service_categories")
    .update({ name: targetName, updated_at: new Date().toISOString() })
    .eq("id", rows[0].id);
}

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

    const { data: industryRow, error: industryErr } = await supabase
      .from("industries")
      .select("name")
      .eq("id", industryId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (industryErr) {
      return { applied: false, error: industryErr.message };
    }
    const industryName = String(industryRow?.name ?? "");
    const categoryName = defaultForm3ServiceCategoryName(industryName);

    await repairLegacyForm3DefaultServiceCategoryName(
      supabase,
      businessId,
      industryId,
      industryName,
    );

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

    const { error: insErr } = await supabase.from("industry_form3_service_categories").insert({
      business_id: businessId,
      industry_id: industryId,
      booking_form_scope: "form3",
      name: categoryName,
      display: "customer_frontend_backend_admin",
      service_category_frequency: true,
      selected_frequencies: selected,
      variables,
      sort_order: 0,
    });
    if (insErr) {
      return { applied: false, error: insErr.message };
    }

    return { applied: true };
  } catch (e) {
    return { applied: false, error: e instanceof Error ? e.message : "seed failed" };
  }
}
