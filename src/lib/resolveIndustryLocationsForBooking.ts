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

export type ResolvedIndustryLocationLabels = {
  labels: string[];
  /** True when this industry has at least one linked `locations` row for the business. */
  hasLinkedLocations: boolean;
};

/**
 * Which location labels (marketing UI strings) apply for this booking input.
 * - `zip`: uses `location_zip_codes` (same as industry-frequency filtering).
 * - `name`: matches typed service-area text against location labels.
 * - `none`: returns [] labels (caller should fall back to free-text address matching).
 */
export async function resolveIndustryLocationLabelsForBookingInput(args: {
  supabase: SupabaseClient;
  businessId: string;
  industryId: string;
  input: string;
  mode: "zip" | "name" | "none";
  useWildcardZip: boolean;
}): Promise<ResolvedIndustryLocationLabels> {
  const rows = await fetchIndustryLocationsForBusiness(args.supabase, args.businessId, args.industryId);
  const hasLinkedLocations = rows.length > 0;
  const withLabels = rows
    .map((r) => ({ ...r, label: marketingLocationDisplayLabel(r) }))
    .filter((r) => r.label.length > 0);

  if (args.mode === "none") {
    return { labels: [], hasLinkedLocations };
  }

  if (args.mode === "name") {
    const q = args.input.trim().toLowerCase().replace(/\s+/g, " ");
    if (q.length < 2) return { labels: [], hasLinkedLocations };
    const out = new Set<string>();
    for (const r of withLabels) {
      const L = r.label.toLowerCase().replace(/\s+/g, " ");
      if (L === q || q.includes(L) || L.includes(q)) out.add(r.label);
    }
    return { labels: Array.from(out), hasLinkedLocations };
  }

  const zip = args.input.trim().replace(/\s/g, "");
  if (zip.length < 5) return { labels: [], hasLinkedLocations };

  const locationIds = rows.map((r) => r.id).filter(Boolean);
  if (!locationIds.length) return { labels: [], hasLinkedLocations };

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
  return { labels: Array.from(out), hasLinkedLocations };
}

/**
 * Enforce book-now / guest booking service area when the store uses zip or city entry
 * and the industry has linked locations. Uses DB `location_management` + wildcard setting.
 */
export async function assertBookingServiceAreaAllowed(args: {
  supabase: SupabaseClient;
  businessId: string;
  industryId: string;
  serviceAreaInput: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: opts } = await args.supabase
    .from("business_store_options")
    .select("location_management, wildcard_zip_enabled")
    .eq("business_id", args.businessId)
    .maybeSingle();

  const lm = opts?.location_management;
  const mode: "zip" | "name" | "none" =
    lm === "name" ? "name" : lm === "none" ? "none" : "zip";
  if (mode === "none") return { ok: true };

  const useWildcardZip = opts?.wildcard_zip_enabled !== false;
  const { labels, hasLinkedLocations } = await resolveIndustryLocationLabelsForBookingInput({
    supabase: args.supabase,
    businessId: args.businessId,
    industryId: args.industryId,
    input: args.serviceAreaInput,
    mode,
    useWildcardZip,
  });

  if (!hasLinkedLocations) return { ok: true };

  const raw = args.serviceAreaInput.trim();
  if (mode === "zip") {
    const z = raw.replace(/\s/g, "");
    if (z.length < 5) {
      return { ok: false, message: "Please enter a valid zip code for your service area." };
    }
  } else if (raw.replace(/\s+/g, " ").trim().length < 2) {
    return { ok: false, message: "Please enter your city or town for your service area." };
  }

  if (labels.length === 0) {
    return {
      ok: false,
      message:
        mode === "zip"
          ? "That zip code is not in our service area. Check your entry or choose another location we serve."
          : "That location is not in our service area. Try the city or town name shown in our service list.",
    };
  }

  return { ok: true };
}
