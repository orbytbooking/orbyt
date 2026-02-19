import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Stripe webhook handler. Uses raw body (request.text()) for signature verification.
 * Do not use request.json() here — the body must remain raw for constructEvent().
 */
export async function POST(request: Request) {
  const stripeSignature = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  if (!stripeSignature) {
    console.error("[Stripe Webhook] Missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (e) {
    console.error("[Stripe Webhook] Failed to read raw body", e);
    return NextResponse.json(
      { error: "Invalid body" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, stripeSignature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe Webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  console.log("[Stripe Webhook] Event received:", event.id, event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log("[Stripe Webhook] checkout.session.completed", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      metadata: session.metadata,
    });

    const bookingId = session.metadata?.booking_id;
    if (bookingId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { error } = await supabase
          .from("bookings")
          .update({ payment_status: "paid" })
          .eq("id", bookingId);
        if (error) {
          console.error("[Stripe Webhook] Failed to update booking payment_status:", bookingId, error);
          return NextResponse.json(
            { error: "Failed to update booking" },
            { status: 500 }
          );
        }
        console.log("[Stripe Webhook] Booking marked as paid:", bookingId);
      } else {
        console.warn("[Stripe Webhook] Supabase not configured; booking not updated:", bookingId);
      }
    } else {
      console.warn("[Stripe Webhook] checkout.session.completed with no booking_id in metadata:", session.id);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
