import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { Resend } from "resend";
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getAuthenticatedUser,
} from "@/lib/auth-helpers";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    if (user.user_metadata?.role === "customer") return createForbiddenResponse("Access denied");

    const { id: bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json({ error: "Booking id is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, business_id, customer_id, customer_email, customer_name, customer_phone, address, apt_no")
      .eq("id", bookingId)
      .maybeSingle();
    if (bookingErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const businessId = String((booking as { business_id?: string }).business_id ?? "");
    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("id, owner_id, name")
      .eq("id", businessId)
      .single();
    if (bizErr || !biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    if ((biz as { owner_id?: string | null }).owner_id !== user.id) {
      return createForbiddenResponse("Access denied");
    }

    const bookingEmail = String((booking as { customer_email?: string | null }).customer_email ?? "").trim();
    if (!bookingEmail) {
      return NextResponse.json(
        { error: "This booking has no customer email. Add it on the booking first." },
        { status: 400 }
      );
    }

    let customerId = String((booking as { customer_id?: string | null }).customer_id ?? "").trim();
    if (!customerId) {
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("business_id", businessId)
        .ilike("email", bookingEmail)
        .maybeSingle();

      customerId = String((existingCustomer as { id?: string } | null)?.id ?? "").trim();
      if (!customerId) {
        const { data: created, error: createErr } = await supabase
          .from("customers")
          .insert({
            business_id: businessId,
            name: (booking as { customer_name?: string | null }).customer_name ?? "Customer",
            email: bookingEmail,
            phone: (booking as { customer_phone?: string | null }).customer_phone ?? null,
            address: (booking as { address?: string | null }).address ?? null,
            apt_no: (booking as { apt_no?: string | null }).apt_no ?? null,
          })
          .select("id")
          .single();
        if (createErr || !created?.id) {
          return NextResponse.json(
            { error: createErr?.message || "Failed to create a customer for this booking" },
            { status: 500 }
          );
        }
        customerId = created.id;
      }

      await supabase
        .from("bookings")
        .update({ customer_id: customerId, updated_at: new Date().toISOString() })
        .eq("id", bookingId)
        .eq("business_id", businessId);
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
    const { error: linkErr } = await supabase.from("customer_add_card_links").insert({
      business_id: businessId,
      customer_id: customerId,
      token,
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    });
    if (linkErr) {
      return NextResponse.json({ error: linkErr.message }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || _request.nextUrl.origin;
    const url = `${appUrl}/add-card?token=${encodeURIComponent(token)}`;

    let emailSent = false;
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      emailSent = true;
    } else {
      try {
        const resend = new Resend(resendKey);
        const { error } = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@yourdomain.com",
          to: [bookingEmail],
          subject: `Add a card on file for ${(biz as { name?: string }).name || "your account"}`,
          html: `
            <p>Please use this secure link to add your card:</p>
            <p><a href="${url}">${url}</a></p>
            <p>This link can be used once and expires in 24 hours.</p>
          `,
        });
        emailSent = !error;
      } catch {
        emailSent = false;
      }
    }

    if (!emailSent) {
      return NextResponse.json({ error: "Failed to send add-card email. Check Resend configuration." }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      emailSent: true,
      sentTo: bookingEmail,
      url,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[send-add-card-link]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
