import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      bookingId,
      amountInCents,
      customerEmail,
      successUrl,
      cancelUrl,
      businessId,
      lineItemDescription,
    } = body as {
      bookingId: string;
      amountInCents: number;
      customerEmail?: string;
      successUrl?: string;
      cancelUrl?: string;
      businessId?: string;
      lineItemDescription?: string;
    };

    if (!bookingId || amountInCents == null || amountInCents < 50) {
      return NextResponse.json(
        { error: "bookingId and amountInCents (min 50) are required" },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    let stripeConnectAccountId: string | null = null;
    if (businessId && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { data: business } = await supabase
        .from("businesses")
        .select("stripe_connect_account_id")
        .eq("id", businessId)
        .single();
      stripeConnectAccountId = (business as { stripe_connect_account_id?: string } | null)?.stripe_connect_account_id ?? null;
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "";
    const success = successUrl || `${origin}/book-now?stripe=success&session_id={CHECKOUT_SESSION_ID}&business=${businessId || ""}`;
    const cancel = cancelUrl || `${origin}/book-now?stripe=cancel&business=${businessId || ""}`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amountInCents),
            product_data: {
              name: "Booking payment",
              description: lineItemDescription || "Service booking",
              images: [],
            },
          },
          quantity: 1,
        },
      ],
      success_url: success,
      cancel_url: cancel,
      customer_email: customerEmail || undefined,
      metadata: {
        booking_id: String(bookingId),
        ...(businessId ? { business_id: String(businessId) } : {}),
      },
    };

    const session = stripeConnectAccountId
      ? await stripe.checkout.sessions.create(sessionParams, {
          stripeAccount: stripeConnectAccountId,
        })
      : await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    console.error("Stripe create-checkout-session error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create checkout session", details: message },
      { status: 500 }
    );
  }
}
