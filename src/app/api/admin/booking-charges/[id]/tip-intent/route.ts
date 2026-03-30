import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from "@/lib/auth-helpers";

/**
 * Create a Stripe PaymentIntent for tip collection directly in the Tip modal.
 * Body: { amount: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const role = user.user_metadata?.role as string | undefined;
    if (role === "customer") return createForbiddenResponse("Customers cannot access this resource");

    const { id: bookingId } = await params;
    const businessId = request.headers.get("x-business-id");
    if (!businessId || !bookingId) {
      return NextResponse.json({ error: "Business ID and booking ID required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount must be greater than 0" }, { status: 400 });
    }
    const amountInCents = Math.round(amount * 100);
    if (amountInCents < 50) {
      return NextResponse.json({ error: "Minimum tip amount is $0.50" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: owned } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!owned) {
      return createForbiddenResponse("You do not have access to this business");
    }

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, business_id, customer_email, customer_name")
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .single();
    if (bookingErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("payment_provider, stripe_connect_account_id, stripe_secret_key, stripe_publishable_key")
      .eq("id", businessId)
      .single();
    if (bizErr || !biz) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const b = biz as {
      payment_provider?: string | null;
      stripe_connect_account_id?: string | null;
      stripe_secret_key?: string | null;
      stripe_publishable_key?: string | null;
    };
    if (b.payment_provider === "authorize_net") {
      return NextResponse.json({ error: "Tip card modal is only available for Stripe businesses" }, { status: 400 });
    }

    const skRaw = b.stripe_secret_key != null ? String(b.stripe_secret_key).trim() : "";
    const stripeSecretKey = skRaw !== "" ? skRaw : null;
    const stripeConnectAccountId = b.stripe_connect_account_id ?? null;
    const publishableKey =
      (b.stripe_publishable_key != null && String(b.stripe_publishable_key).trim() !== ""
        ? String(b.stripe_publishable_key).trim()
        : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) ?? null;
    const secretKey = stripeSecretKey ?? process.env.STRIPE_SECRET_KEY ?? null;

    if (!secretKey || !publishableKey) {
      return NextResponse.json(
        { error: "Stripe keys are not configured. Set publishable and secret keys in Billing settings." },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey);
    const customerEmail = String((booking as { customer_email?: string | null }).customer_email ?? "").trim();
    const customerName = String((booking as { customer_name?: string | null }).customer_name ?? "").trim();

    const intent =
      stripeSecretKey == null && stripeConnectAccountId
        ? await stripe.paymentIntents.create(
            {
              amount: amountInCents,
              currency: "usd",
              payment_method_types: ["card"],
              receipt_email: customerEmail || undefined,
              description: `Tip payment for booking ${bookingId}`,
              metadata: {
                booking_id: bookingId,
                business_id: businessId,
                kind: "booking_tip",
                customer_name: customerName,
              },
            },
            { stripeAccount: stripeConnectAccountId }
          )
        : await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: "usd",
            payment_method_types: ["card"],
            receipt_email: customerEmail || undefined,
            description: `Tip payment for booking ${bookingId}`,
            metadata: {
              booking_id: bookingId,
              business_id: businessId,
              kind: "booking_tip",
              customer_name: customerName,
            },
          });

    if (!intent.client_secret) {
      return NextResponse.json({ error: "Failed to initialize Stripe payment" }, { status: 500 });
    }

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      publishableKey,
      stripeConnectAccountId: stripeSecretKey == null ? stripeConnectAccountId : null,
    });
  } catch (e) {
    console.error("[booking-charges tip-intent]", e);
    const msg = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

