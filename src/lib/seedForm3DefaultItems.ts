import type { SupabaseClient } from "@supabase/supabase-js";
import { requireIndustryBelongsToBusiness } from "@/lib/industryTenantGuard";

/**
 * Form 3 items are tenant-defined (e.g. haircut type, color service). No platform defaults are seeded.
 * Stored in `industry_form3_items` when the admin adds items.
 */
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
    return { applied: false, skipped: true };
  } catch (e) {
    return { applied: false, error: e instanceof Error ? e.message : "seed failed" };
  }
}
