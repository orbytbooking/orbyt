import { NextRequest, NextResponse } from "next/server";
import { extrasService } from "@/lib/extras";
import { FORM2_EXTRA_SCOPE } from "@/lib/form2ExtrasApi";
import { requireIndustryBelongsToBusiness } from "@/lib/industryTenantGuard";
import { supabaseAdmin } from "@/lib/supabaseClient";
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/auth-helpers";
import { userCanManageBookingsForBusiness } from "@/lib/bookingApiAuth";

/** Reorder Form 2 extras in `industry_form2_extras` only. */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const body = await request.json();
    const { updates, industryId, businessId, business_id } = body;
    const resolvedBusinessId = businessId ?? business_id;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: "Updates array is required" }, { status: 400 });
    }

    for (const update of updates) {
      if (!update.id || typeof update.sort_order !== "number") {
        return NextResponse.json(
          { error: "Each update must have id and sort_order" },
          { status: 400 },
        );
      }
    }
    if (!industryId || !resolvedBusinessId) {
      return NextResponse.json(
        { error: "industryId and businessId are required" },
        { status: 400 },
      );
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }
    const allowed = await userCanManageBookingsForBusiness(
      supabaseAdmin,
      user.id,
      String(resolvedBusinessId),
    );
    if (!allowed) return createForbiddenResponse("You do not have access to this business");
    const tenant = await requireIndustryBelongsToBusiness(
      supabaseAdmin,
      String(resolvedBusinessId),
      String(industryId),
    );
    if (!tenant.ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await extrasService.updateExtraOrder(updates, {
      business_id: String(resolvedBusinessId),
      industry_id: String(industryId),
      booking_form_scope: FORM2_EXTRA_SCOPE.bookingFormScope,
      listing_kind: FORM2_EXTRA_SCOPE.listingKind,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering Form 2 extras:", error);
    return NextResponse.json({ error: "Failed to reorder Form 2 extras" }, { status: 500 });
  }
}
