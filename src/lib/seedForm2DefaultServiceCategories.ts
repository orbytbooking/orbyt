import type { SupabaseClient } from '@supabase/supabase-js';
import { FORM1_DEFAULT_ALL_FREQUENCY_NAMES } from '@/lib/form1DefaultServiceCategoryConfig';
import { requireIndustryBelongsToBusiness } from '@/lib/industryTenantGuard';

/** Preset Form 2 service categories (customer-facing “Both”-style display). */
const FORM2_DEFAULT_SERVICE_CATEGORIES: ReadonlyArray<{ name: string; sort_order: number }> = [
  { name: 'Home Cleaning', sort_order: 0 },
  { name: 'Commercial Cleaning', sort_order: 1 },
];

/**
 * Inserts default Form 2 service categories when none exist for this industry+scope.
 * Uses the same default frequency labels as Form 2 frequency seed so `selected_frequencies` resolves.
 */
export async function seedForm2DefaultServiceCategoriesIfEmpty(
  supabase: SupabaseClient,
  businessId: string,
  industryId: string,
): Promise<{ applied: boolean; skipped?: boolean; error?: string }> {
  try {
    const tenant = await requireIndustryBelongsToBusiness(supabase, businessId, industryId);
    if (!tenant.ok) {
      return { applied: false, error: tenant.error };
    }

    const { count, error: cErr } = await supabase
      .from('industry_service_category')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('industry_id', industryId)
      .eq('booking_form_scope', 'form2');

    if (cErr) {
      return { applied: false, error: cErr.message };
    }
    if ((count ?? 0) > 0) {
      return { applied: false, skipped: true };
    }

    const selected = [...FORM1_DEFAULT_ALL_FREQUENCY_NAMES];
    const variables: Record<string, string[]> = {};

    for (const row of FORM2_DEFAULT_SERVICE_CATEGORIES) {
      const { error: insErr } = await supabase.from('industry_service_category').insert({
        business_id: businessId,
        industry_id: industryId,
        booking_form_scope: 'form2',
        name: row.name,
        display: 'customer_frontend_backend_admin',
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
    return { applied: false, error: e instanceof Error ? e.message : 'seed failed' };
  }
}
