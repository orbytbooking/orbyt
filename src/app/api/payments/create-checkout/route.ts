import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createCheckout } from "@/lib/payments/createCheckout";
import {
  checkoutAmountMismatch,
  resolveExpectedCheckoutCents,
} from "@/lib/payments/resolveBookingPayableCents";

/** Unified checkout: uses business payment_provider (stripe | authorize_net) for the post-gift-card balance. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      bookingId,
      pendingStripeBookingIntentId,
      amountInCents,
      customerEmail,
      successUrl,
      cancelUrl,
      businessId,
      lineItemDescription,
    } = body;

    const hasBooking = Boolean(bookingId && String(bookingId).trim());
    const hasIntent = Boolean(pendingStripeBookingIntentId && String(pendingStripeBookingIntentId).trim());
    if (!hasBooking && !hasIntent) {
      return NextResponse.json(
        { error: "bookingId or pendingStripeBookingIntentId is required" },
        { status: 400 },
      );
    }
    if (hasBooking && hasIntent) {
      return NextResponse.json(
        { error: "Pass only one of bookingId or pendingStripeBookingIntentId" },
        { status: 400 },
      );
    }
    if (amountInCents == null || Number.isNaN(Number(amountInCents))) {
      return NextResponse.json({ error: "amountInCents is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const resolved = await resolveExpectedCheckoutCents(supabase, {
      businessId: businessId ? String(businessId) : null,
      bookingId: hasBooking ? String(bookingId).trim() : null,
      pendingStripeBookingIntentId: hasIntent ? String(pendingStripeBookingIntentId).trim() : null,
    });

    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.message }, { status: 400 });
    }

    if (resolved.giftCardCoversFull || resolved.payableCents < 50) {
      return NextResponse.json(
        {
          error: "NO_CARD_PAYMENT_DUE",
          message:
            "This booking is fully covered by the gift card. Confirm the booking without card checkout.",
          payableCents: resolved.payableCents,
        },
        { status: 400 },
      );
    }

    const clientCents = Math.round(Number(amountInCents));
    if (checkoutAmountMismatch(clientCents, resolved.payableCents)) {
      return NextResponse.json(
        {
          error: "AMOUNT_MISMATCH",
          message: "Payment amount does not match the booking total. Refresh the page and try again.",
          expectedCents: resolved.payableCents,
        },
        { status: 400 },
      );
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "";

    const result = await createCheckout(
      {
        ...(hasBooking ? { bookingId: String(bookingId).trim() } : {}),
        ...(hasIntent ? { pendingStripeBookingIntentId: String(pendingStripeBookingIntentId).trim() } : {}),
        amountInCents: resolved.payableCents,
        customerEmail,
        successUrl,
        cancelUrl,
        businessId,
        lineItemDescription,
        origin,
      },
      supabase,
    );

    return NextResponse.json({
      url: result.url,
      provider: result.provider,
      sessionId: result.sessionId,
      payableCents: resolved.payableCents,
    });
  } catch (err) {
    console.error("Payments create-checkout error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    const isConfig = message.includes("not configured") || message.includes("Authorize.net");
    const status = isConfig ? 500 : 500;
    return NextResponse.json(
      { error: "Failed to create checkout", details: message },
      { status },
    );
  }
}
