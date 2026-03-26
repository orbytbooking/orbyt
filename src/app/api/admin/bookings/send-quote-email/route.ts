import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import {
  buildQuoteEmailHtml,
  buildQuoteEmailPayloadFromBooking,
  defaultQuoteEmailSubject,
} from "@/lib/quoteEmailTemplate";
import { getRequestClientIp, insertQuoteEmailLog } from "@/lib/draftQuoteLogs";

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

    const { data: businessAccess, error: accessError } = await supabase
      .from("businesses")
      .select("id, owner_id, name, business_email, website")
      .eq("owner_id", user.id)
      .eq("id", businessId)
      .single();

    if (accessError || !businessAccess) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    const to = typeof body.to === "string" ? body.to.trim() : "";
    const subject =
      typeof body.subject === "string" && body.subject.trim()
        ? body.subject.trim()
        : defaultQuoteEmailSubject(businessAccess.name || "Our business");

    if (!bookingId || !to) {
      return NextResponse.json({ error: "bookingId and to (email) are required" }, { status: 400 });
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to);
    if (!emailOk) {
      return NextResponse.json({ error: "Invalid recipient email" }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const { data: industryRow } = await supabase
      .from("industries")
      .select("name")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const appOrigin = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, "");
    const contactEmail = (businessAccess.business_email || "").trim() || "noreply@configured.app";

    let expiresOnDisplay: string | undefined;
    let daysUntilExpiry: number | undefined;
    if (body.expiresOn && typeof body.expiresOn === "string") {
      const d = new Date(body.expiresOn.slice(0, 10) + "T12:00:00");
      if (!Number.isNaN(d.getTime())) {
        expiresOnDisplay = `${format(d, "MM/dd/yyyy")} at 11:59 PM`;
        daysUntilExpiry = differenceInCalendarDays(startOfDay(d), startOfDay(new Date()));
        if (daysUntilExpiry < 0) daysUntilExpiry = 0;
      }
    }

    const sendReminder = body.sendReminder === true;
    const sendReminderAfterDays =
      sendReminder &&
      body.sendReminderAfterDays != null &&
      Number.isFinite(Number(body.sendReminderAfterDays))
        ? Math.min(90, Math.max(1, Math.floor(Number(body.sendReminderAfterDays))))
        : null;
    const includeOffer = body.includeOffer === true;
    const offerType =
      body.offerType === "percentage" ? ("percentage" as const) : ("fixed" as const);
    const offerValueN = body.offerValue != null && Number.isFinite(Number(body.offerValue))
      ? Number(body.offerValue)
      : null;

    const payload = buildQuoteEmailPayloadFromBooking(booking as Record<string, unknown>, {
      businessName: businessAccess.name || "Our business",
      contactEmail,
      websiteUrl: businessAccess.website,
      industryName: industryRow?.name,
      appOrigin,
      businessId,
      extras: {
        expiresOnDisplay,
        daysUntilExpiry,
        sendReminderAfterDays,
        includeOffer,
        offerType: includeOffer ? offerType : undefined,
        offerValue: includeOffer ? offerValueN : null,
      },
    });

    const html = buildQuoteEmailHtml(payload);
    const clientIp = getRequestClientIp(request);

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!resendKey || !fromEmail) {
      return NextResponse.json(
        { error: "Email is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)" },
        { status: 503 }
      );
    }

    const resend = new Resend(resendKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
      replyTo: contactEmail.includes("@") ? contactEmail : undefined,
    });

    if (error) {
      console.error("send-quote-email Resend error:", error);
      await insertQuoteEmailLog(supabase, {
        business_id: businessId,
        booking_id: bookingId,
        actor_user_id: user.id,
        to_email: to,
        subject,
        status: "failed",
        error_message: error.message || "Failed to send email",
        ip_address: clientIp,
      });
      return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 });
    }

    await insertQuoteEmailLog(supabase, {
      business_id: businessId,
      booking_id: bookingId,
      actor_user_id: user.id,
      to_email: to,
      subject,
      status: "sent",
      ip_address: clientIp,
    });

    if (body.expiresOn && typeof body.expiresOn === "string") {
      const d = body.expiresOn.trim().slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        await supabase
          .from("bookings")
          .update({ draft_quote_expires_on: d, updated_at: new Date().toISOString() })
          .eq("id", bookingId)
          .eq("business_id", businessId);
      }
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (e) {
    console.error("send-quote-email:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
