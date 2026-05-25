import { FORM2_CATALOG_SCOPE } from "@/lib/form2CatalogScope";

/** Form 2 add-ons live only in this table (not Form 1/3/4/5). */
export const FORM2_ADDONS_DB_TABLE = "industry_form2_addons";

export const FORM2_ADDON_SCOPE = {
  bookingFormScope: FORM2_CATALOG_SCOPE,
  listingKind: "addon" as const,
};

export function form2AddonsListUrl(industryId: string, businessId: string): string {
  return `/api/form2/addons?industryId=${encodeURIComponent(industryId)}&businessId=${encodeURIComponent(businessId)}`;
}

export function form2AddonByIdUrl(id: string, industryId: string, businessId: string): string {
  return `/api/form2/addons/${encodeURIComponent(id)}?industryId=${encodeURIComponent(industryId)}&businessId=${encodeURIComponent(businessId)}`;
}

export const FORM2_ADDONS_COLLECTION_URL = "/api/form2/addons";
export const FORM2_ADDONS_REORDER_URL = "/api/form2/addons/reorder";

/** Force Form 2 add-on rows on write (ignore client-sent form3/form1 scope). */
export function normalizeForm2AddonWritePayload<T extends Record<string, unknown>>(row: T): T {
  return {
    ...row,
    booking_form_scope: FORM2_CATALOG_SCOPE,
    listing_kind: "addon",
  };
}
