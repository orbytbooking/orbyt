import type { BookingFormScope, IndustryExtraListingKind } from "@/lib/bookingFormScope";
import { parseListingKindParam } from "@/lib/bookingFormScope";

/** Form 2 admin + customer catalog always use this scope (never form1/form3 rows). */
export const FORM2_CATALOG_SCOPE: BookingFormScope = "form2";

export function isForm2AddonsAdminPath(pathname: string | null | undefined): boolean {
  return Boolean(pathname?.includes("/industries/form-2/add-ons"));
}

export function isForm2ExtrasAdminPath(pathname: string | null | undefined): boolean {
  return Boolean(pathname?.includes("/industries/form-2/extras"));
}

/**
 * Form 2 `/add-ons` routes always use add-ons table (`industry_form2_addons`).
 * `/extras` routes use extras table unless `listingKind=addon` is in the query.
 */
export function resolveForm2ListingKind(
  pathname: string | null | undefined,
  listingKindParam: string | null | undefined,
): IndustryExtraListingKind {
  if (isForm2AddonsAdminPath(pathname)) return "addon";
  const parsed = parseListingKindParam(listingKindParam);
  return parsed === "addon" ? "addon" : "extra";
}

export function form2CatalogScopeQuery(
  listingKind: IndustryExtraListingKind,
  extra?: Record<string, string>,
): string {
  const qs = new URLSearchParams({
    bookingFormScope: FORM2_CATALOG_SCOPE,
    listingKind,
    ...(extra ?? {}),
  });
  return `&${qs.toString()}`;
}
