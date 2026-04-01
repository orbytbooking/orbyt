import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getAuthenticatedUser,
} from "@/lib/auth-helpers";
import { EmailService } from "@/lib/emailService";

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

    const { data: booking, error: bookErr } = await supabase
      .from("bookings")
      .select(
        "id, business_id, customer_email, customer_name, service, total_price, amount, payment_method"
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bookErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const businessId = (booking as { business_id: string }).business_id;
    const { data: business, error: bizErr } = await supabase
      .from("businesses")
      .select("id, owner_id, name, business_email, business_phone")
      .eq("id", businessId)
      .single();

    if (bizErr || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    if ((business as { owner_id?: string | null }).owner_id !== user.id) {
      return createForbiddenResponse("Access denied");
    }

    const to = String((booking as { customer_email?: string | null }).customer_email ?? "").trim();
    if (!to) {
      return NextResponse.json(
        { error: "This booking has no customer email. Add an email on the booking or customer profile first." },
        { status: 400 }
      );
    }

    const raw = (booking as { total_price?: unknown; amount?: unknown }).total_price ?? (booking as { amount?: unknown }).amount;
    const num = typeof raw === "number" ? raw : parseFloat(String(raw ?? "0"));
    const amount = Number.isFinite(num) ? num : 0;

    const pmRaw = String((booking as { payment_method?: string | null }).payment_method ?? "").toLowerCase();
    const paymentMethod = pmRaw === "cash" || pmRaw === "check" ? "cash" : "card";

    const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
    const customerName = String((booking as { customer_name?: string | null }).customer_name ?? "").trim() || "Customer";
    const service = String((booking as { service?: string | null }).service ?? "").trim() || null;
    const businessName = String((business as { name?: string | null }).name ?? "").trim() || "Your service provider";

    let emailService: EmailService;
    try {
      emailService = new EmailService();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Email service unavailable";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const sent = await emailService.sendReceiptEmail({
      to,
      customerName,
      businessName,
      service,
      amount,
      bookingRef: bkRef,
      paymentMethod,
      supportEmail: (business as { business_email?: string | null }).business_email ?? null,
      supportPhone: (business as { business_phone?: string | null }).business_phone ?? null,
    });

    if (!sent) {
      return NextResponse.json({ error: "Failed to send receipt email. Check Resend configuration." }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      message: `Receipt emailed to ${to}.`,
    });
  } catch (e) {
    console.error("[resend-receipt]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
