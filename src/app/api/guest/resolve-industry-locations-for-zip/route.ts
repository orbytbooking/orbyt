import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";
import {
  fetchIndustryLocationsForBusiness,
  resolveIndustryLocationLabelsForBookingInput,
} from "@/lib/resolveIndustryLocationsForBooking";

/**
 * Public helper for coupon / checkout: map customer zip or location text to the same
 * location labels used in Admin → Marketing → Coupons (name || state || city).
 */
export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("business_id")?.trim();
  const industryId = searchParams.get("industry_id")?.trim();
  const input = searchParams.get("input") ?? "";
  const modeRaw = searchParams.get("mode")?.trim().toLowerCase();
  const mode = modeRaw === "name" ? "name" : modeRaw === "none" ? "none" : "zip";
  const metaOnly = searchParams.get("meta_only") === "1" || searchParams.get("meta_only") === "true";

  if (!businessId || !industryId) {
    return NextResponse.json({ error: "business_id and industry_id are required" }, { status: 400 });
  }

  if (metaOnly) {
    const rows = await fetchIndustryLocationsForBusiness(supabaseAdmin, businessId, industryId);
    return NextResponse.json({
      hasLinkedLocations: rows.length > 0,
      mode,
    });
  }

  const { data: opts } = await supabaseAdmin
    .from("business_store_options")
    .select("wildcard_zip_enabled")
    .eq("business_id", businessId)
    .maybeSingle();

  const useWildcardZip = opts?.wildcard_zip_enabled !== false;

  const { labels, hasLinkedLocations } = await resolveIndustryLocationLabelsForBookingInput({
    supabase: supabaseAdmin,
    businessId,
    industryId,
    input,
    mode,
    useWildcardZip,
  });

  return NextResponse.json({ labels, hasLinkedLocations, mode });
}
