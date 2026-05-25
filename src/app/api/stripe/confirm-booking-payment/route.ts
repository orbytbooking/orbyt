import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { applyBookingPaidFromStripeSession } from "@/lib/payments/applyBookingPaidFromStripeSession";
import { retrieveBookingStripeCheckoutSession } from "@/lib/payments/retrieveBookingStripeCheckoutSession";

/**
 * Public: after Stripe Checkout success, the browser lands on /pay/booking-complete with session_id.
 * Retrieves the session on the correct Stripe account (platform vs Connect) and marks the booking paid.
 * Supplements webhooks (often missing for Connect or local dev).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const businessId = typeof body.businessId === "string" ? body.businessId.trim() : "";
    if (!sessionId || !businessId) {
      return NextResponse.json({ error: "sessionId and businessId are required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const retrieved = await retrieveBookingStripeCheckoutSession(sessionId, businessId, supabase);
    if ("error" in retrieved) {
      const status = retrieved.error === "stripe_not_configured" ? 500 : 400;
      return NextResponse.json({ error: retrieved.error }, { status });
    }

    const { session } = retrieved;
    const metaBusiness = session.metadata?.business_id;
    if (metaBusiness && metaBusiness !== businessId) {
      return NextResponse.json({ error: "Session does not match this business" }, { status: 400 });
    }

    const result = await applyBookingPaidFromStripeSession(session, supabase, { sendReceipt: true });
    if (!result.ok) {
      const status = result.error === "payment_not_complete" ? 409 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[confirm-booking-payment]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
