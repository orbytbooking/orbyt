import { NextRequest, NextResponse } from "next/server";
import { extrasService } from "@/lib/extras";
import { FORM2_ADDON_SCOPE } from "@/lib/form2AddonsApi";
import { requireIndustryBelongsToBusiness } from "@/lib/industryTenantGuard";
import { supabaseAdmin } from "@/lib/supabaseClient";

/** Form 2 add-on by id — `industry_form2_addons` only. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get("industryId");
    const businessId = searchParams.get("businessId") || searchParams.get("business_id");

    if (!id || id === "undefined" || id === "null") {
      return NextResponse.json({ error: "Add-on ID is required" }, { status: 400 });
    }
    if (!industryId || !businessId) {
      return NextResponse.json(
        { error: "industryId and businessId are required" },
        { status: 400 },
      );
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }
    const tenant = await requireIndustryBelongsToBusiness(supabaseAdmin, businessId, industryId);
    if (!tenant.ok) {
      return NextResponse.json({ error: "Add-on not found" }, { status: 404 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: "Invalid add-on ID format" }, { status: 400 });
    }

    const addon = await extrasService.getExtraById(id, {
      business_id: businessId,
      industry_id: industryId,
      booking_form_scope: FORM2_ADDON_SCOPE.bookingFormScope,
      listing_kind: FORM2_ADDON_SCOPE.listingKind,
    });

    if (!addon) {
      return NextResponse.json({ error: "Add-on not found" }, { status: 404 });
    }

    return NextResponse.json({ addon, extra: addon });
  } catch (error) {
    console.error("Error fetching Form 2 add-on:", error);
    return NextResponse.json({ error: "Failed to fetch Form 2 add-on" }, { status: 500 });
  }
}
