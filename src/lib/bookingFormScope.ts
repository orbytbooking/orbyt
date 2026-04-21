export type BookingFormScope = 'form1' | 'form2';

export type IndustryExtraListingKind = 'extra' | 'addon';

export function parseBookingFormScopeParam(
  raw: string | null | undefined,
): BookingFormScope | null {
  if (raw === 'form2') return 'form2';
  if (raw === 'form1') return 'form1';
  return null;
}

/** Admin URLs: default form1 when the query param is absent. */
export function bookingFormScopeFromSearchParams(
  raw: string | null | undefined,
): BookingFormScope {
  return parseBookingFormScopeParam(raw) ?? 'form1';
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
