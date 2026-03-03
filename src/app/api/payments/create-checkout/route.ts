import { NextResponse } from "next/server";
import { createCheckout } from "@/lib/payments/createCheckout";

/** Unified checkout: uses business's payment_provider (stripe | worldpay) to create session and return URL */
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
    } = body;

    if (!bookingId || amountInCents == null || amountInCents < 50) {
      return NextResponse.json(
        { error: "bookingId and amountInCents (min 50) are required" },
        { status: 400 }
      );
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "";

    const result = await createCheckout(
      {
        bookingId,
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
    const isConfig = message.includes("not configured") || message.includes("WORLDPAY");
    const isUpstream = /Worldpay failed \(\d+\)/.test(message);
    const status = isConfig ? 500 : isUpstream ? 502 : 500;
    return NextResponse.json(
      { error: "Failed to create checkout", details: message },
      { status }
    );
  }
}
