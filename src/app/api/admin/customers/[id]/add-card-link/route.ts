import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { Resend } from "resend";
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getAuthenticatedUser,
} from "@/lib/auth-helpers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    if (user.user_metadata?.role === "customer") return createForbiddenResponse("Access denied");

    const { id: customerId } = await params;
    const body = await request.json().catch(() => ({}));
    const businessId =
      typeof body.businessId === "string" ? body.businessId.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 200) : "";
    const sendModeRaw = typeof body.sendMode === "string" ? body.sendMode.trim().toLowerCase() : "none";
    const sendMode = (sendModeRaw === "none" || sendModeRaw === "email" || sendModeRaw === "sms" || sendModeRaw === "both")
      ? sendModeRaw
      : "none";
    const sendEmail = sendMode === "email" || sendMode === "both";
    const sendSms = sendMode === "sms" || sendMode === "both";
    if (!businessId || !customerId) {
      return NextResponse.json({ error: "businessId and customerId are required" }, { status: 400 });
    }

    const supabase = getAdmin();
    if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

    // Ensure caller owns the business
    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("id, owner_id, name")
      .eq("id", businessId)
      .single();
    if (bizErr || !biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    if ((biz as { owner_id?: string | null }).owner_id !== user.id) {
      return createForbiddenResponse("Access denied to this business");
    }

    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .select("id, email, name")
      .eq("id", customerId)
      .eq("business_id", businessId)
      .single();
    if (custErr || !customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const token = crypto.randomBytes(24).toString("hex"); // 48 chars
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
    const { error: insErr } = await supabase.from("customer_add_card_links").insert({
      business_id: businessId,
      customer_id: customerId,
      token,
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
      message: message || null,
    });
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const url = `${origin}/add-card?token=${encodeURIComponent(token)}`;

    let emailSent = false;
    if (sendEmail) {
      const email = String((customer as any).email || "").trim();
      if (email) {
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          try {
            const resend = new Resend(resendKey);
            const { error } = await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || "noreply@yourdomain.com",
              to: [email],
              subject: `Add a card on file for ${(biz as any).name || "your account"}`,
              html: `
                <p>${message ? `${message}<br/>` : ""}Please use this secure link to add your card:</p>
                <p><a href="${url}">${url}</a></p>
                <p>This link can be used once and expires in 24 hours.</p>
              `,
            });
            emailSent = !error;
          } catch {
            emailSent = false;
          }
        } else {
          // Dev fallback: no Resend configured
          emailSent = true;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      url,
      token,
      expiresAt: expiresAt.toISOString(),
      sendMode,
      emailSent,
      smsSent: false,
      warning: sendSms ? "SMS sending is not configured yet in this workspace." : undefined,
    });
  } catch (e) {
    console.error("[admin/customers/add-card-link]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

