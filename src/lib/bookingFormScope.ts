export type BookingFormScope = 'form1' | 'form2' | 'form3' | 'form4';

export type IndustryExtraListingKind = 'extra' | 'addon';

export function parseBookingFormScopeParam(
  raw: string | null | undefined,
): BookingFormScope | null {
  if (raw === 'form2') return 'form2';
  if (raw === 'form3') return 'form3';
  if (raw === 'form4') return 'form4';
  if (raw === 'form1') return 'form1';
  return null;
}

/** Rows in industry_* tables are scoped by this column for form1–form4. */
export function hasBookingFormScopeColumnFilter(scope: BookingFormScope | null | undefined): boolean {
  return scope === 'form1' || scope === 'form2' || scope === 'form3' || scope === 'form4';
}

/**
 * Admin URLs: default form1 when the query param is absent.
 * When `pathname` is provided (e.g. from `usePathname()`), infer `form2` / `form3` from
 * `/industries/form-2/...` or `/industries/form-3/...` so re-exported pages under those
 * segments still scope APIs correctly if the query is missing.
 */
export function bookingFormScopeFromSearchParams(
  raw: string | null | undefined,
  pathname?: string | null,
): BookingFormScope {
  const parsed = parseBookingFormScopeParam(raw ?? null);
  if (parsed) return parsed;
  if (pathname) {
    if (pathname.includes('/industries/form-4')) return 'form4';
    if (pathname.includes('/industries/form-3')) return 'form3';
    if (pathname.includes('/industries/form-2')) return 'form2';
  }
  return 'form1';
}

export function parseListingKindParam(
  raw: string | null | undefined,
): IndustryExtraListingKind | null {
  if (raw === 'addon') return 'addon';
  if (raw === 'extra') return 'extra';
  return null;
}

/** Form 2 packages added without attaching to a specific item use this `variable_category`. */
export const FORM2_STANDALONE_PACKAGE_CATEGORY = '__form2_standalone__';

/** Label for that bucket in admin lists (not the raw key). */
export const FORM2_STANDALONE_PACKAGE_LIST_LABEL = 'Packages';
