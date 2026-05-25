import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from "@/lib/adminTenantContext";
import { assertUserHasAdminModuleAccess } from "@/lib/bookingApiAuth";
import { buildUnifiedBusinessLogs } from "@/lib/adminBusinessLogs";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId, user } = ctx;

    const { searchParams } = new URL(request.url);
    const hinted =
      searchParams.get("businessId")?.trim() ||
      searchParams.get("business_id")?.trim() ||
      request.headers.get("x-business-id")?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const access = await assertUserHasAdminModuleAccess(user.id, businessId, "logs");
    if (access === "no_service_role") {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    if (access === "denied") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const bookingId =
      searchParams.get("bookingId")?.trim() ||
      searchParams.get("booking")?.trim() ||
      null;

    const limitRaw = Number(searchParams.get("limit") ?? "120");
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 300) : 120;
    const fetchCap = Math.min(Math.max(limit * 2, 150), 500);

    if (bookingId) {
      const { data: bookingRow, error: bookingErr } = await supabase
        .from("bookings")
        .select("id")
        .eq("id", bookingId)
        .eq("business_id", businessId)
        .maybeSingle();

      if (bookingErr || !bookingRow) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
    }

    const { entries: merged, warnings } = await buildUnifiedBusinessLogs(supabase, businessId, {
      bookingId,
      fetchCap,
    });

    const entries = merged.slice(0, limit);

    const fetchNote =
      warnings.length > 0
        ? [
            "Some sources could not be loaded (tables may be missing on older databases).",
            ...warnings.slice(0, 4),
          ].join(" ")
        : null;

    return NextResponse.json({ entries, fetchNote });
  } catch (e) {
    console.error("admin/logs GET:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
