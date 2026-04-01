import { NextResponse } from "next/server";
import { createCheckout } from "@/lib/payments/createCheckout";

/** Unified checkout: uses business's payment_provider (stripe | authorize_net) to create session and return URL */
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
    if ((!hasBooking && !hasIntent) || amountInCents == null || amountInCents < 50) {
      return NextResponse.json(
        { error: "bookingId or pendingStripeBookingIntentId, and amountInCents (min 50), are required" },
        { status: 400 }
      );
    }
    if (hasBooking && hasIntent) {
      return NextResponse.json(
        { error: "Pass only one of bookingId or pendingStripeBookingIntentId" },
        { status: 400 }
      );
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "";

    const result = await createCheckout(
      {
        ...(hasBooking ? { bookingId: String(bookingId).trim() } : {}),
        ...(hasIntent ? { pendingStripeBookingIntentId: String(pendingStripeBookingIntentId).trim() } : {}),
        amountInCents,
        customerEmail,
        successUrl,
        cancelUrl,
        businessId,
        lineItemDescription,
        origin,
      }
    );

    return NextResponse.json({
      url: result.url,
      provider: result.provider,
      sessionId: result.sessionId,
    });
  } catch (err) {
    console.error("Payments create-checkout error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    const isConfig = message.includes("not configured") || message.includes("Authorize.net");
    const status = isConfig ? 500 : 500;
    return NextResponse.json(
      { error: "Failed to create checkout", details: message },
      { status }
    );
  }
}
