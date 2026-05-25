import type { SupabaseClient } from '@supabase/supabase-js';
import { requireIndustryBelongsToBusiness } from '@/lib/industryTenantGuard';
import { FORM2_STANDALONE_PACKAGE_CATEGORY } from '@/lib/bookingFormScope';
import { resolveForm2PackageItemSelectValue } from '@/lib/form2PackageItemLink';

type ItemRow = {
  id: string;
  category: string | null;
  sort_order: number | null;
};

const DISPLAY_BOTH = 'Customer Frontend, Backend & Admin';
const SQFT_CATEGORY = 'Sq Ft';

type TemplateKey = 'basic' | 'premium' | 'full_space' | 'rug';

type PackageTemplate = { key: TemplateKey; label: string; order: number };
type ExistingPackageRow = {
  id: string;
  name: string | null;
  description: string | null;
  variable_category: string | null;
  icon: string | null;
};

function templatesForCategory(category: string): PackageTemplate[] {
  if (category === SQFT_CATEGORY) {
    return [
      { key: 'full_space', label: 'Full Space Cleaning', order: 0 },
      { key: 'rug', label: 'Rug Cleaning', order: 1 },
    ];
  }
  return [
    { key: 'basic', label: 'Basic Package', order: 0 },
    { key: 'premium', label: 'Premium Package', order: 1 },
    { key: 'rug', label: 'Rug Cleaning', order: 2 },
  ];
}

function getItemIndexPrice(template: TemplateKey, idx: number): number {
  if (template === 'basic') return idx === 1 ? 139 : idx === 2 ? 199 : 299;
  if (template === 'premium') return idx === 1 ? 199 : idx === 2 ? 299 : 459;
  if (template === 'full_space') return idx === 1 ? 139 : idx === 2 ? 199 : 299;
  return idx === 1 ? 59 : idx === 2 ? 89 : 139;
}

function getItemIndexTime(template: TemplateKey, idx: number): number {
  if (template === 'basic') return idx === 1 ? 120 : idx === 2 ? 240 : 360;
  if (template === 'premium') return idx === 1 ? 180 : idx === 2 ? 360 : 480;
  if (template === 'full_space') return idx === 1 ? 140 : idx === 2 ? 240 : 360;
  return idx === 1 ? 60 : idx === 2 ? 80 : 140;
}

function getTemplateDescription(template: TemplateKey, category: string): string {
  if (template === 'basic') {
    return [
      'This is a full home carpet cleaning.',
      '• All Carpets',
      '• All Rugs',
      '• Deep Steaming',
      '• Hot Water Extraction',
    ].join('\n');
  }
  if (template === 'premium') {
    return [
      'This is a full home carpet cleaning with extras.',
      '• All Carpets',
      '• All Rugs and Mats',
      '• All Bed Mattresses',
      '• All Upholstery',
      '• Deep Steaming',
      '• Hot Water Extraction',
    ].join('\n');
  }
  if (template === 'full_space') {
    return [
      'This is a full commercial carpet and rug cleaning.',
      '• All Carpets',
      '• All Rugs',
      '• Deep Steaming',
      '• Hot Water Extraction',
    ].join('\n');
  }
  return category === SQFT_CATEGORY
    ? 'Deep cleaning of all rugs in the office.'
    : 'Deep cleaning of all rugs in the home.';
}

function getTemplateIcon(template: TemplateKey): string {
  if (template === 'premium') return 'sparkles';
  if (template === 'rug') return 'layers';
  return 'package';
}

function inferTemplateKeyFromPackageRow(row: ExistingPackageRow): TemplateKey | null {
  const name = String(row.name ?? '').toLowerCase();
  const description = String(row.description ?? '').toLowerCase();
  const category = String(row.variable_category ?? '').toLowerCase();
  if (name.includes('rug cleaning')) return 'rug';
  if (name.includes('premium package') || description.includes('with extras')) return 'premium';
  if (name.includes('full space cleaning') || (category === 'sq ft' && name.includes('cleaning'))) return 'full_space';
  if (name.includes('basic package')) return 'basic';
  return null;
}

function groupForm2ItemsByCategory(variableRows: ItemRow[]): Map<string, ItemRow[]> {
  const byCategory = new Map<string, ItemRow[]>();
  for (const row of variableRows ?? []) {
    const category = String(row.category ?? '').trim();
    if (!category) continue;
    const curr = byCategory.get(category) ?? [];
    curr.push(row);
    byCategory.set(category, curr);
  }
  return byCategory;
}

function appendPackageRows(
  byCategory: Map<string, ItemRow[]>,
  businessId: string,
  industryId: string,
  /** Only emit rows for these variable ids; omit = all items */
  onlyVariableIds?: Set<string>,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];

  for (const [category, items] of byCategory.entries()) {
    if (!items.length) continue;
    const templates = templatesForCategory(category);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (onlyVariableIds && !onlyVariableIds.has(item.id)) continue;
      const itemIndex = i + 1;
      const itemSort = item.sort_order ?? i;
      for (const template of templates) {
        rows.push({
          business_id: businessId,
          industry_id: industryId,
          name: `${template.label} ${itemIndex}`,
          description: getTemplateDescription(template.key, category),
          icon: getTemplateIcon(template.key),
          variable_category: category,
          price: getItemIndexPrice(template.key, itemIndex),
          time_minutes: getItemIndexTime(template.key, itemIndex),
          display: DISPLAY_BOTH,
          service_category: null,
          frequency: null,
          is_default: true,
          show_based_on_frequency: false,
          show_based_on_service_category: false,
          show_based_on_service_category2: false,
          sort_order: itemSort * 10 + template.order,
          booking_form_scope: 'form2',
          pricing_variable_id: item.id,
        });
      }
    }
  }

  return rows;
}

/**
 * When an industry has zero Form 2 package rows, insert starter packages for every item category
 * (not only Bedroom / Sq Ft — those names are just the default preset from seedForm2DefaultPricingVariables).
 */
export async function seedForm2DefaultPackagesIfEmpty(
  supabase: SupabaseClient,
  businessId: string,
  industryId: string,
): Promise<{ applied: boolean; skipped?: boolean; error?: string }> {
  try {
    const tenant = await requireIndustryBelongsToBusiness(supabase, businessId, industryId);
    if (!tenant.ok) return { applied: false, error: "error" in tenant ? tenant.error : "Industry tenant check failed" };

    const { count, error: cErr } = await supabase
      .from('industry_form2_packages')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('industry_id', industryId)
      .eq('booking_form_scope', 'form2');
    if (cErr) return { applied: false, error: cErr.message };
    if ((count ?? 0) > 0) return { applied: false, skipped: true };

    const { data: variableRows, error: vErr } = await supabase
      .from('industry_form2_items')
      .select('id, category, sort_order')
      .eq('business_id', businessId)
      .eq('industry_id', industryId)
      .eq('booking_form_scope', 'form2')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (vErr) return { applied: false, error: vErr.message };

    const byCategory = groupForm2ItemsByCategory((variableRows ?? []) as ItemRow[]);
    const rows = appendPackageRows(byCategory, businessId, industryId);
    if (rows.length === 0) return { applied: false, skipped: true };

    const { error: insErr } = await supabase.from('industry_form2_packages').insert(rows);
    if (insErr) return { applied: false, error: insErr.message };
    return { applied: true };
  } catch (e) {
    return { applied: false, error: e instanceof Error ? e.message : 'seed failed' };
  }
}

/**
 * Inserts default Form 2 packages only for pricing variables that have no package rows yet.
 * Use when the industry already had some Form 2 parameters (so {@link seedForm2DefaultPackagesIfEmpty} skipped)
 * or after adding new items — avoids duplicate rows for variables that already have packages.
 */
export async function seedForm2MissingPackagesPerVariable(
  supabase: SupabaseClient,
  businessId: string,
  industryId: string,
): Promise<{ applied: boolean; inserted?: number; skipped?: boolean; error?: string }> {
  try {
    const tenant = await requireIndustryBelongsToBusiness(supabase, businessId, industryId);
    if (!tenant.ok) return { applied: false, error: "error" in tenant ? tenant.error : "Industry tenant check failed" };

    const { data: variableRows, error: vErr } = await supabase
      .from('industry_form2_items')
      .select('id, category, sort_order')
      .eq('business_id', businessId)
      .eq('industry_id', industryId)
      .eq('booking_form_scope', 'form2')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (vErr) return { applied: false, error: vErr.message };

    const byCategory = groupForm2ItemsByCategory((variableRows ?? []) as ItemRow[]);
    if (byCategory.size === 0) return { applied: false, skipped: true };

    const { data: paramRows, error: pErr } = await supabase
      .from('industry_form2_packages')
      .select('pricing_variable_id')
      .eq('business_id', businessId)
      .eq('industry_id', industryId)
      .eq('booking_form_scope', 'form2');
    if (pErr) return { applied: false, error: pErr.message };

    const covered = new Set(
      (paramRows ?? [])
        .map((p: { pricing_variable_id?: string | null }) => p.pricing_variable_id)
        .filter((id): id is string => Boolean(id)),
    );

    const missingIds = new Set<string>();
    for (const items of byCategory.values()) {
      for (const item of items) {
        if (!covered.has(item.id)) missingIds.add(item.id);
      }
    }
    if (missingIds.size === 0) return { applied: false, skipped: true };

    const rows = appendPackageRows(byCategory, businessId, industryId, missingIds);
    if (rows.length === 0) return { applied: false, skipped: true };

    const { error: insErr } = await supabase.from('industry_form2_packages').insert(rows);
    if (insErr) return { applied: false, error: insErr.message };
    return { applied: true, inserted: rows.length };
  } catch (e) {
    return { applied: false, error: e instanceof Error ? e.message : 'seed failed' };
  }
}

/**
 * Backfills icon presets for existing default Form 2 package rows that were created before icon seeding.
 */
export async function backfillForm2DefaultPackageIcons(
  supabase: SupabaseClient,
  businessId: string,
  industryId: string,
): Promise<{ applied: boolean; updated?: number; skipped?: boolean; error?: string }> {
  try {
    const tenant = await requireIndustryBelongsToBusiness(supabase, businessId, industryId);
    if (!tenant.ok) return { applied: false, error: "error" in tenant ? tenant.error : "Industry tenant check failed" };

    const { data: rows, error: fetchErr } = await supabase
      .from('industry_form2_packages')
      .select('id, name, description, variable_category, icon')
      .eq('business_id', businessId)
      .eq('industry_id', industryId)
      .eq('booking_form_scope', 'form2')
      .eq('is_default', true);
    if (fetchErr) return { applied: false, error: fetchErr.message };
    const existing = (rows ?? []) as ExistingPackageRow[];

    const updates: Array<{ id: string; icon: string }> = [];
    for (const row of existing) {
      if (String(row.icon ?? '').trim()) continue;
      const template = inferTemplateKeyFromPackageRow(row);
      if (!template) continue;
      updates.push({ id: row.id, icon: getTemplateIcon(template) });
    }

    if (updates.length === 0) return { applied: false, skipped: true };

    for (const update of updates) {
      const { error: upErr } = await supabase
        .from('industry_form2_packages')
        .update({ icon: update.icon })
        .eq('id', update.id)
        .eq('business_id', businessId)
        .eq('industry_id', industryId);
      if (upErr) return { applied: false, error: upErr.message };
    }

    return { applied: true, updated: updates.length };
  } catch (e) {
    return { applied: false, error: e instanceof Error ? e.message : 'backfill failed' };
  }
}

/** Ensures user-created rows are returned on book-now (legacy rows may have null booking_form_scope). */
export async function backfillForm2PackageBookingScope(
  supabase: SupabaseClient,
  businessId: string,
  industryId: string,
): Promise<{ applied: boolean; updated?: number; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('industry_form2_packages')
      .update({ booking_form_scope: 'form2' })
      .eq('business_id', businessId)
      .eq('industry_id', industryId)
      .is('booking_form_scope', null)
      .select('id');
    if (error) return { applied: false, error: error.message };
    return { applied: (data?.length ?? 0) > 0, updated: data?.length ?? 0 };
  } catch (e) {
    return { applied: false, error: e instanceof Error ? e.message : 'backfill failed' };
  }
}

type PackageItemLinkRow = {
  id: string;
  name: string | null;
  variable_category: string | null;
  pricing_variable_id: string | null;
};

/**
 * Backfills pricing_variable_id on Form 2 packages created before item linkage was saved.
 */
export async function backfillForm2PackageItemLinks(
  supabase: SupabaseClient,
  businessId: string,
  industryId: string,
): Promise<{ applied: boolean; updated?: number; skipped?: boolean; error?: string }> {
  try {
    const tenant = await requireIndustryBelongsToBusiness(supabase, businessId, industryId);
    if (!tenant.ok) return { applied: false, error: 'error' in tenant ? tenant.error : 'Industry tenant check failed' };

    const { data: itemRows, error: itemErr } = await supabase
      .from('industry_form2_items')
      .select('id, name, category, sort_order')
      .eq('business_id', businessId)
      .eq('industry_id', industryId)
      .eq('booking_form_scope', 'form2')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (itemErr) return { applied: false, error: itemErr.message };

    const variables = (itemRows ?? []).map((row: { id: string; name?: string | null; category?: string | null; sort_order?: number }) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      sortOrder: row.sort_order ?? 0,
    }));
    if (variables.length === 0) return { applied: false, skipped: true };

    const { data: packageRows, error: pkgErr } = await supabase
      .from('industry_form2_packages')
      .select('id, name, variable_category, pricing_variable_id')
      .eq('business_id', businessId)
      .eq('industry_id', industryId)
      .eq('booking_form_scope', 'form2');
    if (pkgErr) return { applied: false, error: pkgErr.message };

    const updates: Array<{ id: string; pricing_variable_id: string }> = [];
    for (const row of (packageRows ?? []) as PackageItemLinkRow[]) {
      if (String(row.pricing_variable_id ?? '').trim()) continue;
      const cat = String(row.variable_category ?? '').trim();
      if (!cat || cat === FORM2_STANDALONE_PACKAGE_CATEGORY) continue;

      const itemId = resolveForm2PackageItemSelectValue({
        pricingVariableId: null,
        variableCategory: row.variable_category,
        packageName: row.name,
        variables,
      });
      if (!itemId || itemId === FORM2_STANDALONE_PACKAGE_CATEGORY) continue;
      if (!variables.some((v) => String(v.id) === itemId)) continue;
      updates.push({ id: row.id, pricing_variable_id: itemId });
    }

    if (updates.length === 0) return { applied: false, skipped: true };

    for (const update of updates) {
      const { error: upErr } = await supabase
        .from('industry_form2_packages')
        .update({ pricing_variable_id: update.pricing_variable_id })
        .eq('id', update.id)
        .eq('business_id', businessId)
        .eq('industry_id', industryId);
      if (upErr) return { applied: false, error: upErr.message };
    }

    return { applied: true, updated: updates.length };
  } catch (e) {
    return { applied: false, error: e instanceof Error ? e.message : 'backfill failed' };
  }
}
