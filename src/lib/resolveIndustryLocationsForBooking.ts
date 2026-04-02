import type { SupabaseClient } from "@supabase/supabase-js";

/** Same ordering as admin Marketing → coupons location list (`industry-locations` UI). */
export function marketingLocationDisplayLabel(row: {
  name?: string | null;
  state?: string | null;
  city?: string | null;
}): string {
  return String(row?.name || row?.state || row?.city || "").trim();
}

export type IndustryLocationRow = {
  id: string;
  name?: string | null;
  city?: string | null;
  state?: string | null;
};

export async function fetchIndustryLocationsForBusiness(
  supabase: SupabaseClient,
  businessId: string,
  industryId: string
): Promise<IndustryLocationRow[]> {
  const { data: links, error } = await supabase
    .from("industry_location")
    .select("location_id")
    .eq("business_id", businessId)
    .eq("industry_id", industryId);
  if (error || !links?.length) return [];
  const locationIds = [
    ...new Set(
      links
        .map((r: { location_id?: string }) => r.location_id)
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    ),
  ];
  if (!locationIds.length) return [];
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name, city, state")
    .eq("business_id", businessId)
    .in("id", locationIds);
  return (locations || []) as IndustryLocationRow[];
}

/**
 * Which location labels (marketing UI strings) apply for this booking input.
 * - `zip`: uses `location_zip_codes` (same as industry-frequency filtering).
 * - `name`: matches typed service-area text against location labels.
 * - `none`: returns [] (caller should fall back to free-text address matching).
 */
export async function resolveIndustryLocationLabelsForBookingInput(args: {
  supabase: SupabaseClient;
  businessId: string;
  industryId: string;
  input: string;
  mode: "zip" | "name" | "none";
  useWildcardZip: boolean;
}): Promise<string[]> {
  const rows = await fetchIndustryLocationsForBusiness(args.supabase, args.businessId, args.industryId);
  const withLabels = rows
    .map((r) => ({ ...r, label: marketingLocationDisplayLabel(r) }))
    .filter((r) => r.label.length > 0);

  if (args.mode === "none") {
    return [];
  }

  if (args.mode === "name") {
    const q = args.input.trim().toLowerCase().replace(/\s+/g, " ");
    if (q.length < 2) return [];
    const out = new Set<string>();
    for (const r of withLabels) {
      const L = r.label.toLowerCase().replace(/\s+/g, " ");
      if (L === q || q.includes(L) || L.includes(q)) out.add(r.label);
    }
    return Array.from(out);
  }

  const zip = args.input.trim().replace(/\s/g, "");
  if (zip.length < 5) return [];

  const locationIds = rows.map((r) => r.id).filter(Boolean);
  if (!locationIds.length) return [];

  let query = args.supabase
    .from("location_zip_codes")
    .select("location_id")
    .eq("active", true)
    .in("location_id", locationIds);
  if (args.useWildcardZip) {
    query = query.ilike("zip_code", `${zip}%`);
  } else {
    query = query.eq("zip_code", zip);
  }
  const { data: zrows } = await query;
  const matchIds = new Set(
    (zrows || [])
      .map((z: { location_id?: string }) => z.location_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  );
  const out = new Set<string>();
  for (const r of withLabels) {
    if (matchIds.has(r.id)) out.add(r.label);
  }
  return Array.from(out);
}
