import type { SupabaseClient } from '@supabase/supabase-js';
import { requireIndustryBelongsToBusiness } from '@/lib/industryTenantGuard';

type IdRow = { id: string };

function isEmptyIdList(value: unknown): boolean {
  return !Array.isArray(value) || value.length === 0;
}

/**
 * After default Form 2 entities exist, wire dependency checklists the way a fresh admin setup expects:
 * - Frequencies: all service categories, items, and packages checked; location dependency off.
 * - Service categories: all items and packages checked under `variables`.
 * - Packages: per-package dependency radios off (not gated by frequency/service/item).
 *
 * Only fills empty checklist fields so existing admin configuration is not overwritten.
 */
export async function backfillForm2DefaultDependencyConfig(
  supabase: SupabaseClient,
  businessId: string,
  industryId: string,
): Promise<{ applied: boolean; skipped?: boolean; error?: string }> {
  try {
    const tenant = await requireIndustryBelongsToBusiness(supabase, businessId, industryId);
    if (!tenant.ok) {
      return { applied: false, error: 'error' in tenant ? tenant.error : 'Industry tenant check failed' };
    }

    const scopeFilter = {
      business_id: businessId,
      industry_id: industryId,
      booking_form_scope: 'form2' as const,
    };

    const [freqRes, catRes, itemRes, pkgRes] = await Promise.all([
      supabase
        .from('industry_form2_frequencies')
        .select('id, service_categories, bathroom_variables, sqft_variables, show_based_on_location')
        .match(scopeFilter),
      supabase.from('industry_form2_service_categories').select('id, variables').match(scopeFilter),
      supabase.from('industry_form2_items').select('id').match(scopeFilter),
      supabase.from('industry_form2_packages').select('id').match(scopeFilter),
    ]);

    if (freqRes.error) return { applied: false, error: freqRes.error.message };
    if (catRes.error) return { applied: false, error: catRes.error.message };
    if (itemRes.error) return { applied: false, error: itemRes.error.message };
    if (pkgRes.error) return { applied: false, error: pkgRes.error.message };

    const frequencies = (freqRes.data ?? []) as Array<{
      id: string;
      service_categories?: unknown;
      bathroom_variables?: unknown;
      sqft_variables?: unknown;
      show_based_on_location?: boolean | null;
    }>;
    const categories = (catRes.data ?? []) as Array<{ id: string; variables?: Record<string, unknown> | null }>;
    const items = (itemRes.data ?? []) as IdRow[];
    const packages = (pkgRes.data ?? []) as IdRow[];

    if (frequencies.length === 0 && categories.length === 0 && packages.length === 0) {
      return { applied: false, skipped: true };
    }

    const categoryIds = categories.map((c) => String(c.id));
    const itemIds = items.map((i) => String(i.id));
    const packageIds = packages.map((p) => String(p.id));

    for (const freq of frequencies) {
      const patch: Record<string, unknown> = {};
      if (!freq.show_based_on_location) {
        patch.show_based_on_location = false;
        patch.location_ids = [];
      }
      if (isEmptyIdList(freq.service_categories) && categoryIds.length > 0) {
        patch.service_categories = categoryIds;
      }
      if (isEmptyIdList(freq.bathroom_variables) && itemIds.length > 0) {
        patch.bathroom_variables = itemIds;
      }
      if (isEmptyIdList(freq.sqft_variables) && packageIds.length > 0) {
        patch.sqft_variables = packageIds;
      }
      if (Object.keys(patch).length === 0) continue;

      const { error } = await supabase
        .from('industry_form2_frequencies')
        .update(patch)
        .eq('id', freq.id)
        .eq('business_id', businessId)
        .eq('industry_id', industryId);
      if (error) return { applied: false, error: error.message };
    }

    for (const cat of categories) {
      const prev =
        cat.variables && typeof cat.variables === 'object' && !Array.isArray(cat.variables)
          ? (cat.variables as Record<string, unknown>)
          : {};
      const prevItems = prev.Items;
      const prevPackages = prev.Packages;
      const nextVars = { ...prev };
      let changed = false;
      if (isEmptyIdList(prevItems) && itemIds.length > 0) {
        nextVars.Items = itemIds;
        changed = true;
      }
      if (isEmptyIdList(prevPackages) && packageIds.length > 0) {
        nextVars.Packages = packageIds;
        changed = true;
      }
      if (!changed) continue;

      const { error } = await supabase
        .from('industry_form2_service_categories')
        .update({ variables: nextVars })
        .eq('id', cat.id)
        .eq('business_id', businessId)
        .eq('industry_id', industryId);
      if (error) return { applied: false, error: error.message };
    }

    if (packageIds.length > 0) {
      const { error } = await supabase
        .from('industry_form2_packages')
        .update({
          show_based_on_frequency: false,
          show_based_on_service_category: false,
          show_based_on_service_category2: false,
          frequency: null,
          service_category: null,
        })
        .eq('business_id', businessId)
        .eq('industry_id', industryId)
        .eq('booking_form_scope', 'form2')
        .in('id', packageIds);
      if (error) return { applied: false, error: error.message };
    }

    return { applied: true };
  } catch (e) {
    return { applied: false, error: e instanceof Error ? e.message : 'backfill failed' };
  }
}
