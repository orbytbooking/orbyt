import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from "@/lib/adminTenantContext";
import { assertUserHasAdminModuleAccess } from "@/lib/bookingApiAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId, user } = ctx;

    const hinted = request.headers.get("x-business-id")?.trim() || null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

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
        .select("id, created_at, activity_text, actor_name, event_key")
        .eq("booking_id", bookingId)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false }),
      supabase
        .from("booking_quote_email_logs")
        .select("id, created_at, to_email, subject, status, error_message")
        .eq("booking_id", bookingId)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false }),
    ]);

    const warnings: string[] = [];
    if (activityRes.error) warnings.push(`Activity logs: ${activityRes.error.message}`);
    if (emailRes.error) warnings.push(`Email logs: ${emailRes.error.message}`);

    const bookingLogs = (activityRes.data ?? []).map((row) => ({
      id: row.id,
      created_at: row.created_at,
      activity_text: row.activity_text,
      actor_name: row.actor_name,
      event_key: row.event_key,
    }));

    const emailLogs = (emailRes.data ?? []).map((row) => ({
      id: row.id,
      created_at: row.created_at,
      to_email: row.to_email,
      subject: row.subject,
      status: row.status,
      error_message: row.error_message,
    }));

    const fetchNote =
      warnings.length > 0
        ? [
            "Some log sources could not be loaded. Apply database/migrations/072_booking_quote_logs.sql if needed.",
            ...warnings.slice(0, 2),
          ].join(" ")
        : null;

    return NextResponse.json({ bookingLogs, emailLogs, fetchNote });
  } catch (e) {
    console.error("booking logs GET:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
