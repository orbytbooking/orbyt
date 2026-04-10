import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertUserHasAdminModuleAccess } from "@/lib/bookingApiAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
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

    if (!bookingId || bookingId === "undefined") {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }

    const access = await assertUserHasAdminModuleAccess(user.id, businessId, "bookings");
    if (access === "no_service_role") {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    if (access === "denied") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { data: bookingRow, error: bookingErr } = await supabase
      .from("bookings")
      .select("id")
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (bookingErr || !bookingRow) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const [activityRes, emailRes] = await Promise.all([
      supabase
        .from("booking_quote_activity_logs")
        .select("id, created_at, activity_text, ip_address, actor_name, event_key")
        .eq("booking_id", bookingId)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false }),
      supabase
        .from("booking_quote_email_logs")
        .select("id, created_at, to_email, subject, status, error_message, ip_address")
        .eq("booking_id", bookingId)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false }),
    ]);

    if (activityRes.error) {
      console.warn("quote-logs activity:", activityRes.error.message);
    }
    if (emailRes.error) {
      console.warn("quote-logs email:", emailRes.error.message);
    }

    const fetchNote =
      activityRes.error || emailRes.error
        ? "History could not be loaded. Apply database/migrations/072_booking_quote_logs.sql on your database if you have not already."
        : null;

    return NextResponse.json({
      history: activityRes.data ?? [],
      emailLogs: emailRes.data ?? [],
      fetchNote,
    });
  } catch (e) {
    console.error("quote-logs GET:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
