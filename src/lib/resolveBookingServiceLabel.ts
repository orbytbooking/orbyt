import type { SupabaseClient } from "@supabase/supabase-js";

import { formatTime12h } from "@/lib/quoteEmailTemplate";

export type BookingDisplaySource = {
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  service?: string | null;
  service_id?: string | null;
  scheduled_time?: string | null;
  time?: string | null;
  customization?: unknown;
  customers?: { name?: string | null; email?: string | null; phone?: string | null } | null;
  recurring_series?: BookingDisplaySource | null;
};

export const SERVICE_CATEGORY_TABLES = [
  "industry_service_category",
  "industry_form2_service_categories",
  "industry_form3_service_categories",
  "industry_form4_service_categories",
  "industry_form5_service_categories",
] as const;

export function serviceFromCustomization(
  customization: unknown,
  serviceCategoryById?: Record<string, string>,
): string | null {
  if (!customization || typeof customization !== "object") return null;
  const c = customization as Record<string, unknown>;
  for (const key of [
    "serviceCategory",
    "service_category",
    "serviceName",
    "service_name",
    "selectedServiceName",
  ]) {
    const s = String(c[key] ?? "").trim();
    if (s) return s;
  }
  const catId = String(
    c.serviceCategoryId ?? c.service_category_id ?? c.selectedServiceId ?? "",
  ).trim();
  if (catId && serviceCategoryById?.[catId]) return serviceCategoryById[catId];
  return null;
}

export type ServiceCategoryListRow = {
  id: string;
  business_id: string;
  industry_id: string;
  name: string;
  customer_end_name?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
};

/** Load active service categories for a business across all booking form tables. */
export async function loadServiceCategoriesForBusiness(
  supabase: SupabaseClient,
  businessId: string,
  industryId?: string | null,
): Promise<ServiceCategoryListRow[]> {
  const rows: ServiceCategoryListRow[] = [];

  await Promise.all(
    SERVICE_CATEGORY_TABLES.map(async (table) => {
      let query = supabase
        .from(table)
        .select("id, business_id, industry_id, name, customer_end_name, sort_order, created_at")
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (industryId) {
        query = query.eq("industry_id", industryId);
      }

      const { data, error } = await query;
      if (error) {
        if (error.code === "42P01") return;
        throw error;
      }

      for (const row of data ?? []) {
        rows.push(row as ServiceCategoryListRow);
      }
    }),
  );

  rows.sort((a, b) => {
    const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
  });

  return rows;
}

export async function loadServiceCategoryNameById(
  supabase: SupabaseClient,
  businessId: string,
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  await Promise.all(
    SERVICE_CATEGORY_TABLES.map(async (table) => {
      const { data } = await supabase
        .from(table)
        .select("id, name, customer_end_name")
        .eq("business_id", businessId);
      for (const row of data ?? []) {
        const label = String(
          (row as { customer_end_name?: string | null; name?: string | null }).customer_end_name ??
            (row as { name?: string | null }).name ??
            "",
        ).trim();
        const id = String((row as { id?: string }).id ?? "").trim();
        if (id && label) map[id] = label;
      }
    }),
  );
  return map;
}

/** Resolve denormalized booking columns from joined customers and recurring series. */
export function enrichBookingDisplayFields(
  booking: BookingDisplaySource,
  series?: BookingDisplaySource | null,
  serviceCategoryById?: Record<string, string>,
): {
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  service: string | null;
  time: string;
} {
  const customers = booking.customers;
  const seriesRow = series ?? booking.recurring_series ?? null;
  const customer_name =
    String(booking.customer_name ?? customers?.name ?? seriesRow?.customer_name ?? "").trim() || null;
  const customer_email =
    String(booking.customer_email ?? customers?.email ?? seriesRow?.customer_email ?? "").trim() || null;
  const customer_phone =
    String(booking.customer_phone ?? customers?.phone ?? seriesRow?.customer_phone ?? "").trim() || null;
  const service = resolveBookingServiceLabel(booking, {
    series: seriesRow,
    serviceCategoryById,
    emptyFallback: null,
  });
  const rawTime = String(seriesRow?.scheduled_time ?? booking.scheduled_time ?? booking.time ?? "").trim();
  const time = formatTime12h(rawTime) || rawTime;
  return { customer_name, customer_email, customer_phone, service, time };
}

/** Service name for admin summaries; returns null when unknown. */
export function resolveBookingServiceLabel(
  booking: BookingDisplaySource,
  options?: {
    series?: BookingDisplaySource | null;
    serviceCategoryById?: Record<string, string>;
    emptyFallback?: string | null;
  },
): string | null {
  const seriesRow = options?.series ?? booking.recurring_series ?? null;
  const serviceCategoryById = options?.serviceCategoryById;
  const serviceId = String(booking.service_id ?? "").trim();
  const name = String(
    booking.service ??
      seriesRow?.service ??
      (serviceId && serviceCategoryById?.[serviceId] ? serviceCategoryById[serviceId] : "") ??
      serviceFromCustomization(booking.customization, serviceCategoryById) ??
      serviceFromCustomization(seriesRow?.customization, serviceCategoryById) ??
      "",
  ).trim();
  if (name) return name;
  if (options?.emptyFallback === null) return null;
  return options?.emptyFallback ?? null;
}

/** Always-safe label for summary rows (shows em dash when unknown). */
export function formatBookingServiceSummaryLabel(
  booking: BookingDisplaySource,
  options?: {
    series?: BookingDisplaySource | null;
    serviceCategoryById?: Record<string, string>;
  },
): string {
  return resolveBookingServiceLabel(booking, { ...options, emptyFallback: null }) ?? "—";
}
