import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ensures `industryId` refers to an industry owned by `businessId` (multi-tenant SaaS boundary).
 * Call before server-side seeds or writes that take both IDs from the request layer.
 */
export async function requireIndustryBelongsToBusiness(
  supabase: SupabaseClient,
  businessId: string,
  industryId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const bid = businessId?.trim();
  const iid = industryId?.trim();
  if (!bid || !iid) {
    return { ok: false, error: 'businessId and industryId are required' };
  }

  const { data, error } = await supabase
    .from('industries')
    .select('id')
    .eq('id', iid)
    .eq('business_id', bid)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data?.id) {
    return { ok: false, error: 'Industry not found for this business' };
  }
  return { ok: true };
}
