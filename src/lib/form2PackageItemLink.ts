import { FORM2_STANDALONE_PACKAGE_CATEGORY } from '@/lib/bookingFormScope';

export type Form2ItemRow = {
  id: string;
  name?: string | null;
  category?: string | null;
  sortOrder?: number;
};

/** Preset/default packages use names like "Basic Package 2" (item index at end). */
export function form2PackageItemIndexFromName(name: string | null | undefined): number | null {
  const m = String(name ?? '').trim().match(/\s+(\d+)\s*$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

function itemsInCategory(variables: Form2ItemRow[], category: string): Form2ItemRow[] {
  const cat = category.trim();
  if (!cat) return [];
  return variables
    .filter((v) => String(v.category ?? '').trim() === cat)
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        String(a.name ?? '').localeCompare(String(b.name ?? '')),
    );
}

/**
 * Value for the Form 2 package "Item" select: item id, or standalone bucket key.
 */
export function resolveForm2PackageItemSelectValue(args: {
  pricingVariableId?: string | null;
  variableCategory?: string | null;
  packageName?: string | null;
  variables: Form2ItemRow[];
  urlCategory?: string | null;
}): string {
  const standalone = FORM2_STANDALONE_PACKAGE_CATEGORY;
  const cat = String(args.variableCategory ?? '').trim();
  const pvId = String(args.pricingVariableId ?? '').trim();
  const urlCat = String(args.urlCategory ?? '').trim();

  if (cat === standalone) return standalone;
  if (pvId && args.variables.some((v) => String(v.id) === pvId)) return pvId;
  if (urlCat === standalone) return standalone;
  if (urlCat && args.variables.some((v) => String(v.id) === urlCat)) return urlCat;

  const itemIndex = form2PackageItemIndexFromName(args.packageName);

  if (cat) {
    const inCategory = itemsInCategory(args.variables, cat);
    if (itemIndex != null && itemIndex >= 1 && itemIndex <= inCategory.length) {
      return String(inCategory[itemIndex - 1].id);
    }
    if (inCategory.length === 1) return String(inCategory[0].id);
  }

  if (urlCat) {
    const inUrl = itemsInCategory(args.variables, urlCat);
    if (inUrl.length === 1) return String(inUrl[0].id);
    if (itemIndex != null && itemIndex >= 1 && itemIndex <= inUrl.length) {
      return String(inUrl[itemIndex - 1].id);
    }
    if (args.variables.some((v) => String(v.id) === urlCat)) return urlCat;
  }

  const fallback = pvId || urlCat || cat;
  return normalizeForm2ItemSelectToId(fallback, args.variables, args.packageName);
}

/**
 * Coerce category labels / legacy values to a concrete item id for selects and duplicate checks.
 */
export function normalizeForm2ItemSelectToId(
  value: string,
  variables: Form2ItemRow[],
  packageName?: string | null,
): string {
  const v = String(value ?? '').trim();
  if (!v || v === FORM2_STANDALONE_PACKAGE_CATEGORY) return v;
  if (variables.some((row) => String(row.id) === v)) return v;

  const inCategory = itemsInCategory(variables, v);
  if (inCategory.length === 0) return v;
  if (inCategory.length === 1) return String(inCategory[0].id);

  const itemIndex = form2PackageItemIndexFromName(packageName);
  if (itemIndex != null && itemIndex >= 1 && itemIndex <= inCategory.length) {
    return String(inCategory[itemIndex - 1].id);
  }

  return String(inCategory[0].id);
}

/** Whether the Item select (or legacy category label) is acceptable for save. */
export function isForm2PackageItemSelectValid(value: string, variables: Form2ItemRow[]): boolean {
  const v = String(value ?? '').trim();
  if (!v) return false;
  if (v === FORM2_STANDALONE_PACKAGE_CATEGORY) return true;
  if (variables.some((row) => String(row.id) === v)) return true;
  if (variables.some((row) => String(row.category ?? '').trim() === v)) return true;
  return false;
}

/**
 * Whether a package row belongs to the currently selected Form 2 item (admin + book-now strip).
 */
export function form2PackageMatchesActiveItem(
  pkg: {
    name?: string | null;
    variable_category?: string | null;
    pricing_variable_id?: string | null;
    is_default?: boolean;
  },
  activeItemId: string,
  items: Form2ItemRow[],
): boolean {
  const itemId = String(activeItemId ?? '').trim();
  if (!itemId) return true;

  const activeItem = items.find((v) => String(v.id) === itemId);
  if (!activeItem) return true;

  const linkedId = String(pkg.pricing_variable_id ?? '').trim();
  if (linkedId) return linkedId === itemId;

  const cat = String(activeItem.category ?? '').trim();
  const pkgCat = String(pkg.variable_category ?? '').trim();
  if (!cat || !pkgCat || pkgCat !== cat) return false;

  const inCategory = itemsInCategory(items, cat);
  const pos = inCategory.findIndex((v) => String(v.id) === itemId);
  if (pos < 0) return false;

  const suffixIdx = form2PackageItemIndexFromName(pkg.name);
  if (suffixIdx != null) return suffixIdx === pos + 1;

  // Custom package name without "… 2" suffix: show for every item in this category, or the sole item.
  if (pkg.is_default !== true) return true;
  return inCategory.length === 1;
}

export function form2PackagesShareItemScope(
  row: {
    pricing_variable_id?: string | null;
    variable_category?: string | null;
    name?: string | null;
  },
  itemSelectValue: string,
  variables: Form2ItemRow[],
): boolean {
  const itemKey = String(itemSelectValue ?? '').trim();
  if (!itemKey) return false;
  if (itemKey === FORM2_STANDALONE_PACKAGE_CATEGORY) {
    return String(row.variable_category ?? '').trim() === FORM2_STANDALONE_PACKAGE_CATEGORY;
  }

  const linkedId = String(row.pricing_variable_id ?? '').trim();
  if (linkedId) return linkedId === itemKey;

  const selectedItem = variables.find((v) => String(v.id) === itemKey);
  if (!selectedItem) {
    // Ambiguous category label — do not treat all packages in that category as duplicates of each other.
    if (itemsInCategory(variables, itemKey).length > 1) return false;
    return String(row.variable_category ?? '').trim() === itemKey;
  }

  const cat = String(selectedItem.category ?? '').trim();
  if (String(row.variable_category ?? '').trim() !== cat) return false;

  const inCategory = itemsInCategory(variables, cat);
  const selectedPos = inCategory.findIndex((v) => String(v.id) === itemKey);
  const rowIdx = form2PackageItemIndexFromName(row.name);
  if (selectedPos >= 0 && rowIdx != null) return rowIdx === selectedPos + 1;
  if (selectedPos >= 0 && inCategory.length === 1) return true;

  return true;
}
