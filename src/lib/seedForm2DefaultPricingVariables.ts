import type { SupabaseClient } from '@supabase/supabase-js';
import { requireIndustryBelongsToBusiness } from '@/lib/industryTenantGuard';

/**
 * Default Form 2 “Items” (`industry_pricing_variable` with `booking_form_scope = form2`).
 * Names match common home-size / sqft tiers; `category` groups rows for packages (Bedroom vs Sq Ft).
 */
const FORM2_DEFAULT_PRICING_VARIABLES: ReadonlyArray<{
  name: string;
  category: string;
  description: string;
  sort_order: number;
}> = [
  { name: '0-2 Bedroom Homes', category: 'Bedroom', description: '', sort_order: 0 },
  { name: '3-4 Bedroom Homes', category: 'Bedroom', description: '', sort_order: 1 },
  { name: '5-6 Bedroom Homes', category: 'Bedroom', description: '', sort_order: 2 },
  { name: 'Up To 1,000 SQ FT', category: 'Sq Ft', description: '', sort_order: 3 },
  { name: '1,000-2,000 SQ FT', category: 'Sq Ft', description: '', sort_order: 4 },
  { name: '2,000-3,000 SQ FT', category: 'Sq Ft', description: '', sort_order: 5 },
];

export async function seedForm2DefaultPricingVariablesIfEmpty(
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
      .from('industry_pricing_variable')
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

    const rows = FORM2_DEFAULT_PRICING_VARIABLES.map((row) => ({
      business_id: businessId,
      industry_id: industryId,
      booking_form_scope: 'form2' as const,
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
      popup_content: '',
      popup_display: 'customer_frontend_backend_admin',
      display: 'customer_frontend_backend_admin',
    }));

    const { error: insErr } = await supabase.from('industry_pricing_variable').insert(rows);
    if (insErr) {
      return { applied: false, error: insErr.message };
    }

    return { applied: true };
  } catch (e) {
    return { applied: false, error: e instanceof Error ? e.message : 'seed failed' };
  }
}
