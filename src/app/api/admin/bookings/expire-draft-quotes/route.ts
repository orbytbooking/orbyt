import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertUserHasAdminModuleAccess } from "@/lib/bookingApiAuth";

/**
 * Sets status to expired for draft/quote rows whose draft_quote_expires_on is before today (UTC date).
 * Call when loading admin bookings so expiry stays current without a cron job.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized - No token" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized - Invalid token" }, { status: 401 });
    }

    const businessId = request.headers.get("x-business-id");
    if (!businessId) {
      return NextResponse.json({ error: "Business context required" }, { status: 400 });
    }

    const access = await assertUserHasAdminModuleAccess(user.id, businessId, "bookings");
    if (access === "no_service_role") {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    if (access === "denied") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const today = new Date().toISOString().slice(0, 10);

    const { data: rows, error: updErr } = await supabase
      .from("bookings")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("business_id", businessId)
      .in("status", ["draft", "quote"])
      .not("draft_quote_expires_on", "is", null)
      .lt("draft_quote_expires_on", today)
      .select("id");

    if (updErr) {
      console.warn("expire-draft-quotes:", updErr.message);
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ expired: (rows ?? []).length });
  } catch (e) {
    console.error("expire-draft-quotes:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
