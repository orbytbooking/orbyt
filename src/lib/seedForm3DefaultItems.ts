import type { SupabaseClient } from "@supabase/supabase-js";
import { requireIndustryBelongsToBusiness } from "@/lib/industryTenantGuard";

/**
 * Example Form 3 items (BookingKoala-style “pet” cards). No package/pricing tier — add-ons carry price.
 * Stored in `industry_form3_items`.
 */
const FORM3_DEFAULT_ITEMS: ReadonlyArray<{
  name: string;
  category: string;
  description: string;
  sort_order: number;
}> = [
  { name: "Cat", category: "Pet", description: "", sort_order: 0 },
  { name: "Small Dog", category: "Pet", description: "", sort_order: 1 },
  { name: "Medium Dog", category: "Pet", description: "", sort_order: 2 },
  { name: "Large Dog", category: "Pet", description: "", sort_order: 3 },
  { name: "Bird", category: "Pet", description: "", sort_order: 4 },
];

export async function seedForm3DefaultItemsIfEmpty(
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
      .from("industry_form3_items")
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

    const rows = FORM3_DEFAULT_ITEMS.map((row) => ({
      business_id: businessId,
      industry_id: industryId,
      booking_form_scope: "form3" as const,
      name: row.name,
      category: row.category,
      description: row.description,
      sort_order: row.sort_order,
      is_active: true,
      different_on_customer_end: false,
      customer_end_name: null as string | null,
      show_explanation_icon_on_form: false,
      explanation_tooltip_text: null as string | null,
      enable_popup_on_selection: false,
      popup_content: "",
      popup_display: "customer_frontend_backend_admin",
      display: "customer_frontend_backend_admin",
    }));

    const { error: insErr } = await supabase.from("industry_form3_items").insert(rows);
    if (insErr) {
      return { applied: false, error: insErr.message };
    }

    return { applied: true };
  } catch (e) {
    return { applied: false, error: e instanceof Error ? e.message : "seed failed" };
  }
}
