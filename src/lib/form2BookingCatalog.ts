import {
  filterForm2CatalogItemsByFrequencyDependencies,
  type FrequencyDependencies,
} from '@/lib/frequencyFilter';
import { form2PackagePassesBookingVisibility } from '@/lib/form2PackageVisibility';
import type { PricingParamRow } from '@/lib/pricingParameterVisibility';

export type Form2CatalogItemDto = {
  id: string;
  name: string;
  category: string | null;
  sort_order?: number;
};

export type Form2PackageStripRow = {
  id: string;
  name: string;
  variable_category: string;
  description: string | null;
  price: number;
  time_minutes: number | null;
  icon: string | null;
};

/** Stable cache key when service category dependency checklists change (admin Add Booking). */
export function buildForm2ServiceDependencyKey(
  serviceName: string | null | undefined,
  serviceCategories: Array<{ name: string; variables?: Record<string, unknown> | null }>,
): string {
  const name = String(serviceName ?? '').trim();
  if (!name) return '';
  const selected = serviceCategories.find((c) => c.name === name);
  if (!selected) return name;
  const vars = selected.variables ?? {};
  const items = Array.isArray(vars.Items) ? vars.Items.map((x) => String(x)).join('|') : '';
  const packages = Array.isArray(vars.Packages) ? vars.Packages.map((x) => String(x)).join('|') : '';
  return `${name}::${items}::${packages}`;
}

/** Stable cache key when frequency item/package dependency checklists change. */
export function buildForm2FrequencyDependencyKey(
  deps: FrequencyDependencies | null | undefined,
): string {
  if (!deps) return '';
  const b = (deps.bathroomVariables ?? []).map((x) => String(x)).join('|');
  const s = (deps.sqftVariables ?? []).map((x) => String(x)).join('|');
  return `${b}::${s}`;
}

export function getForm2ServiceItemAllowlist(
  serviceCategory: { variables?: Record<string, unknown> | null } | null | undefined,
  isForm2: boolean,
): string[] | null {
  if (!isForm2 || !serviceCategory) return null;
  if (!Array.isArray(serviceCategory.variables?.Items)) return null;
  const list = (serviceCategory.variables.Items as unknown[])
    .map((x) => String(x).trim())
    .filter((x) => x.length > 0);
  return list.length > 0 ? list : null;
}

export function getForm2ServicePackageAllowlist(
  serviceCategory: { variables?: Record<string, unknown> | null } | null | undefined,
): string[] | null {
  if (!serviceCategory || !Array.isArray(serviceCategory.variables?.Packages)) return null;
  const list = (serviceCategory.variables.Packages as unknown[])
    .map((x) => String(x).trim())
    .filter((x) => x.length > 0);
  return list.length > 0 ? list : null;
}

/** Item grid allowlists: service category → Items, then frequency → bathroom_variables. */
export function filterForm2ItemsForBooking<T extends { id: string; name: string }>(
  items: T[],
  opts: {
    serviceItemAllowlist: string[] | null;
    frequencyDeps: FrequencyDependencies | null | undefined;
  },
): T[] {
  let rows = items;
  if (opts.serviceItemAllowlist && opts.serviceItemAllowlist.length > 0) {
    rows = rows.filter((r) => {
      const id = String(r.id ?? '').trim();
      const name = String(r.name ?? '').trim();
      return (
        opts.serviceItemAllowlist!.includes(id) ||
        (name.length > 0 && opts.serviceItemAllowlist!.includes(name))
      );
    });
  }
  return filterForm2CatalogItemsByFrequencyDependencies(rows, opts.frequencyDeps);
}

export function mapApiRowsToForm2CatalogItems(
  list: Array<Record<string, unknown>>,
): Form2CatalogItemDto[] {
  return list
    .map((v) => ({
      id: String(v.id ?? ''),
      name: String(v.name ?? '').trim(),
      category:
        v.category != null && String(v.category).trim() !== ''
          ? String(v.category).trim()
          : null,
      sort_order: typeof v.sort_order === 'number' ? v.sort_order : Number(v.sort_order) || 0,
    }))
    .filter((x) => Boolean(x.id) && Boolean(x.name))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
}

export function buildForm2PackageStripRows(
  pricingParameters: PricingParamRow[],
  ctx: {
    frequencyDeps: FrequencyDependencies | null;
    serviceCategory: {
      variables?: Record<string, unknown> | null;
      service_category_frequency?: boolean;
    } | null;
    selectedFrequency: string;
    selectedServiceName: string;
    selectedBedroomTier?: string | null;
  },
): Form2PackageStripRow[] {
  const servicePackageAllowlist = getForm2ServicePackageAllowlist(ctx.serviceCategory);
  const serviceUsesFrequencyDeps = Boolean(ctx.serviceCategory?.service_category_frequency);

  return pricingParameters
    .filter((p) =>
      form2PackagePassesBookingVisibility(p, {
        frequencyDeps: ctx.frequencyDeps,
        servicePackageAllowlist,
        selectedFrequency: ctx.selectedFrequency,
        selectedServiceName: ctx.selectedServiceName,
        selectedBedroomTier: ctx.selectedBedroomTier ?? null,
        serviceUsesFrequencyDeps,
      }),
    )
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
    .map((p) => ({
      id: String(p.id ?? ''),
      name: p.name,
      variable_category: p.variable_category,
      description: (p as { description?: string | null }).description ?? null,
      price: typeof p.price === 'number' ? p.price : Number(p.price) || 0,
      time_minutes:
        (p as { time_minutes?: number | null }).time_minutes != null
          ? Number((p as { time_minutes?: number | null }).time_minutes)
          : null,
      icon: (p as { icon?: string | null }).icon ?? null,
    }))
    .filter((x) => Boolean(x.id));
}

export function resolveForm2PackageSelection(
  pricingParameters: PricingParamRow[],
  rawSelection: string,
): PricingParamRow | null {
  const selection = String(rawSelection ?? '').trim();
  if (!selection || selection.toLowerCase() === 'none') return null;
  const byId = pricingParameters.find((p) => String(p.id ?? '').trim() === selection);
  if (byId) return byId;
  return pricingParameters.find((p) => String(p.name ?? '').trim() === selection) ?? null;
}
