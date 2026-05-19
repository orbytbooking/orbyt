import { FORM2_CATALOG_SCOPE } from "@/lib/form2CatalogScope";

/** Form 2 extras live only in this table (not Form 1/3/4/5). */
export const FORM2_EXTRAS_DB_TABLE = "industry_form2_extras";

export const FORM2_EXTRA_SCOPE = {
  bookingFormScope: FORM2_CATALOG_SCOPE,
  listingKind: "extra" as const,
};

export function form2ExtrasListUrl(industryId: string, businessId: string): string {
  return `/api/form2/extras?industryId=${encodeURIComponent(industryId)}&businessId=${encodeURIComponent(businessId)}`;
}

export function form2ExtraByIdUrl(id: string, industryId: string, businessId: string): string {
  return `/api/form2/extras/${encodeURIComponent(id)}?industryId=${encodeURIComponent(industryId)}&businessId=${encodeURIComponent(businessId)}`;
}

export const FORM2_EXTRAS_COLLECTION_URL = "/api/form2/extras";
export const FORM2_EXTRAS_REORDER_URL = "/api/form2/extras/reorder";

/** Force Form 2 extra rows on write (ignore client-sent form3/form1 scope). */
export function normalizeForm2ExtraWritePayload<T extends Record<string, unknown>>(row: T): T {
  return {
    ...row,
    booking_form_scope: FORM2_CATALOG_SCOPE,
    listing_kind: "extra",
  };
}
