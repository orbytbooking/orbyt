import { NextRequest, NextResponse } from "next/server";
import { extrasService, pickIndustryExtraWritePayload } from "@/lib/extras";
import { FORM2_EXTRA_SCOPE, normalizeForm2ExtraWritePayload } from "@/lib/form2ExtrasApi";
import { requireIndustryBelongsToBusiness } from "@/lib/industryTenantGuard";
import { supabaseAdmin } from "@/lib/supabaseClient";
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/auth-helpers";
import { userCanManageBookingsForBusiness } from "@/lib/bookingApiAuth";

function queryBusinessId(request: NextRequest, searchParams: URLSearchParams): string | null {
  return (
    searchParams.get("businessId") ||
    searchParams.get("business_id") ||
    searchParams.get("business") ||
    request.headers.get("x-business-id")
  );
}

function messageFromUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Unknown error";
}

function supabaseErrorPayload(error: unknown) {
  const message = messageFromUnknownError(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : undefined;
  const details =
    error && typeof error === "object" && "details" in error
      ? (error as { details: unknown }).details
      : undefined;
  const hint =
    error && typeof error === "object" && "hint" in error
      ? (error as { hint: unknown }).hint
      : undefined;

  return { userMessage: message, code, details, hint };
}

/** Form 2 extras only — reads/writes `industry_form2_extras`, never Form 3. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get("industryId");
    const businessId = queryBusinessId(request, searchParams);

    if (!industryId) {
      return NextResponse.json({ error: "Industry ID is required" }, { status: 400 });
    }
    if (!businessId?.trim()) {
      return NextResponse.json({ extras: [] }, { status: 200 });
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }
    const tenant = await requireIndustryBelongsToBusiness(supabaseAdmin, businessId, industryId);
    if (!tenant.ok) {
      return NextResponse.json({ error: "Extras not found" }, { status: 404 });
    }

    const extras = await extrasService.getExtrasByIndustry(industryId, {
      businessId,
      bookingFormScope: FORM2_EXTRA_SCOPE.bookingFormScope,
      listingKind: FORM2_EXTRA_SCOPE.listingKind,
    });

    return NextResponse.json({ extras });
  } catch (error) {
    console.error("Error fetching Form 2 extras:", error);
    return NextResponse.json({ error: "Failed to fetch Form 2 extras" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const body = await request.json();
    const extraData = normalizeForm2ExtraWritePayload(
      pickIndustryExtraWritePayload(body) as Record<string, unknown>,
    ) as Parameters<typeof extrasService.createExtra>[0];

    if (!extraData.industry_id) {
      return NextResponse.json({ error: "Industry ID is required" }, { status: 400 });
    }
    if (!extraData.business_id) {
      return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
    }

    const name = typeof extraData.name === "string" ? extraData.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    extraData.name = name;

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }
    const allowed = await userCanManageBookingsForBusiness(
      supabaseAdmin,
      user.id,
      String(extraData.business_id),
    );
    if (!allowed) return createForbiddenResponse("You do not have access to this business");
    const tenant = await requireIndustryBelongsToBusiness(
      supabaseAdmin,
      String(extraData.business_id),
      String(extraData.industry_id),
    );
    if (!tenant.ok) {
      return NextResponse.json({ error: "Industry not found for this business" }, { status: 404 });
    }

    const extra = await extrasService.createExtra(extraData);
    return NextResponse.json({ extra }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating Form 2 extra:", error);
    const { userMessage, code, details, hint } = supabaseErrorPayload(error);
    return NextResponse.json(
      { error: userMessage, details: details ?? hint ?? undefined, code: code || undefined },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const body = await request.json();
    const { id, business_id: bodyBusinessId, industry_id: bodyIndustryId, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: "Extra ID is required" }, { status: 400 });
    }
    if (!bodyBusinessId || !bodyIndustryId) {
      return NextResponse.json(
        { error: "business_id and industry_id are required" },
        { status: 400 },
      );
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
    }
    const allowed = await userCanManageBookingsForBusiness(supabaseAdmin, user.id, String(bodyBusinessId));
    if (!allowed) return createForbiddenResponse("You do not have access to this business");
    const tenantPut = await requireIndustryBelongsToBusiness(
      supabaseAdmin,
      bodyBusinessId,
      bodyIndustryId,
    );
    if (!tenantPut.ok) {
      return NextResponse.json({ error: "Extra not found" }, { status: 404 });
    }

    const updateData = normalizeForm2ExtraWritePayload(
      pickIndustryExtraWritePayload(rest) as Record<string, unknown>,
    );
    delete updateData.business_id;
    delete updateData.industry_id;

    const nameRaw = updateData.name;
    if (nameRaw !== undefined) {
      const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
      if (!name) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updateData.name = name;
    }

    const extra = await extrasService.updateExtra(id, updateData, {
      business_id: bodyBusinessId,
      industry_id: bodyIndustryId,
      booking_form_scope: FORM2_EXTRA_SCOPE.bookingFormScope,
      listing_kind: FORM2_EXTRA_SCOPE.listingKind,
    });

    return NextResponse.json({ extra });
  } catch (error: unknown) {
    console.error("Error updating Form 2 extra:", error);
    const { userMessage, code, details, hint } = supabaseErrorPayload(error);
    return NextResponse.json(
      { error: userMessage, details: details ?? hint ?? undefined, code: code || undefined },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const industryId = searchParams.get("industryId");
    const businessId = queryBusinessId(request, searchParams);
    const permanent = searchParams.get("permanent") === "true";

    if (!id) {
      return NextResponse.json({ error: "Extra ID is required" }, { status: 400 });
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
    const allowed = await userCanManageBookingsForBusiness(supabaseAdmin, user.id, String(businessId));
    if (!allowed) return createForbiddenResponse("You do not have access to this business");
    const tenantDel = await requireIndustryBelongsToBusiness(supabaseAdmin, businessId, industryId);
    if (!tenantDel.ok) {
      return NextResponse.json({ error: "Extra not found" }, { status: 404 });
    }

    const scope = {
      business_id: businessId,
      industry_id: industryId,
      booking_form_scope: FORM2_EXTRA_SCOPE.bookingFormScope,
      listing_kind: FORM2_EXTRA_SCOPE.listingKind,
    };

    const result = permanent
      ? await extrasService.permanentlyDeleteExtra(id, scope)
      : await extrasService.deleteExtra(id, scope);

    if (!result.deleted) {
      return NextResponse.json({ error: "Extra not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Form 2 extra:", error);
    return NextResponse.json({ error: "Failed to delete Form 2 extra" }, { status: 500 });
  }
}
