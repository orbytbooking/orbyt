import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  describeDraftQuoteExpiryChange,
  normalizeExpiryDateValue,
} from "@/lib/draftQuoteExpiryUtils";
import {
  formatQuoteLogActorName,
  getRequestClientIp,
  insertQuoteActivityLog,
} from "@/lib/draftQuoteLogs";

export async function PATCH(
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

    const { data: businessAccess, error: accessError } = await supabase
      .from("businesses")
      .select("id, owner_id")
      .eq("owner_id", user.id)
      .eq("id", businessId)
      .single();

    if (accessError || !businessAccess) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    if (!bookingId || bookingId === "undefined") {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const rawNext = body?.draft_quote_expires_on;

    let nextVal: string | null = null;
    if (rawNext === null || rawNext === undefined || rawNext === "") {
      nextVal = null;
    } else if (typeof rawNext === "string") {
      const s = rawNext.trim().slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        nextVal = s;
      } else {
        return NextResponse.json({ error: "Invalid draft_quote_expires_on (use YYYY-MM-DD)" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { data: row, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, status, draft_quote_expires_on")
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (fetchErr || !row) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!["draft", "quote", "expired"].includes(row.status)) {
      return NextResponse.json(
        { error: "Expiry can only be changed for draft, quote, or expired bookings" },
        { status: 400 }
      );
    }

    const priorNorm = normalizeExpiryDateValue(row.draft_quote_expires_on);
    const nextNorm = normalizeExpiryDateValue(nextVal);
    if (priorNorm === nextNorm) {
      return NextResponse.json({ success: true, unchanged: true, data: row });
    }

    const { data: updated, error: updErr } = await supabase
      .from("bookings")
      .update({
        draft_quote_expires_on: nextVal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    const actorName = formatQuoteLogActorName(user);
    await insertQuoteActivityLog(supabase, {
      business_id: businessId,
      booking_id: bookingId,
      actor_user_id: user.id,
      actor_name: actorName,
      activity_text: describeDraftQuoteExpiryChange(
        bookingId,
        row.draft_quote_expires_on,
        nextVal,
        actorName
      ),
      event_key: "draft_quote_expiry_changed",
      ip_address: getRequestClientIp(request),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error("draft-quote-expiry PATCH:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
