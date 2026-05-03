import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdminTenantContext, assertBusinessIdMatchesContext } from "@/lib/adminTenantContext";
import { resolvePublicAssetUrls, substituteEmailPlaceholders } from "@/lib/emailTemplatePlaceholders";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId, user } = ctx;

    let payload: { subject?: string; body?: string; to?: string; businessId?: string } = {};
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const hinted =
      request.headers.get("x-business-id")?.trim() ||
      (typeof payload.businessId === "string" ? payload.businessId.trim() : "") ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const subject = String(payload.subject ?? "").trim() || "Test notification template";
    const body = String(payload.body ?? "").trim();
    if (!body) {
      return NextResponse.json({ error: "Template body is required" }, { status: 400 });
    }

    const fallbackTo = (user.email || "").trim();
    const to = String(payload.to ?? "").trim() || fallbackTo;
    if (!to || !isValidEmail(to)) {
      return NextResponse.json({ error: "A valid recipient email is required" }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!resendApiKey || !fromEmail) {
      return NextResponse.json(
        { error: "Email is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)" },
        { status: 503 },
      );
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("name, website, logo_url, business_email, business_phone, currency")
      .eq("id", businessId)
      .maybeSingle();

    const appBase = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, "");
    const siteUrl =
      business?.website && /^https?:\/\//i.test(String(business.website))
        ? String(business.website).replace(/\/$/, "")
        : appBase;

    const vars = {
      email_body: `<p style="margin:0 0 12px;">This is a test email generated from your notification template editor.</p>`,
      customer_name: "Jane Customer",
      business_name: business?.name || "Your Business",
      business_logo_url: business?.logo_url || `${appBase}/images/logo.png`,
      support_email: business?.business_email || "support@yourbusiness.com",
      support_phone: business?.business_phone || "+1 (555) 000-0000",
      store_currency: business?.currency || "USD",
      service: "Deep Cleaning",
      date: "Tuesday, April 14, 2026",
      time: "14:30",
      address: "123 Main St, Springfield",
      booking_ref: "BK-123456",
      total_price: "99.00",
      total_price_formatted: "$99.00",
      invoice_number: "INV-1001",
      total_amount: "149.50",
      total_amount_formatted: "$149.50",
      due_date: "May 1, 2026",
      issue_date: "April 1, 2026",
      description: "Test email description",
      line_summary: "Service: $99.00",
      view_url: `${appBase}/invoice/sample-token`,
      site_url: siteUrl,
    };

    const renderedSubject = substituteEmailPlaceholders(subject, vars);
    const renderedHtml = resolvePublicAssetUrls(
      substituteEmailPlaceholders(body, vars, { escapeValues: true, htmlUnescapedKeys: ["email_body"] }),
      appBase,
    );

    const resend = new Resend(resendApiKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: renderedSubject,
      html: renderedHtml,
      replyTo: (business?.business_email || "").trim() || undefined,
    });

    if (error) {
      console.error("send-test-email resend error:", error);
      return NextResponse.json({ error: error.message || "Failed to send test email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id, to });
  } catch (error) {
    console.error("send-test-email route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

