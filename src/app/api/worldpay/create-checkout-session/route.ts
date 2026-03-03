import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const WORLDPAY_TEST_BASE = "https://try.access.worldpay.com";
const WORLDPAY_LIVE_BASE = "https://access.worldpay.com";

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

    const baseUrl = (process.env.WORLDPAY_BASE_URL || WORLDPAY_TEST_BASE).trim();
    const entity = process.env.WORLDPAY_ENTITY?.trim();
    const useBasicAuth = process.env.WORLDPAY_USE_BASIC_AUTH === "true";
    const basicAuthRaw = process.env.WORLDPAY_BASIC_AUTH?.trim();
    const serviceKey = process.env.WORLD_PAY_SERVICE_KEY?.trim();
    const accountToken = process.env.WORLDPAY_ACCOUNT_TOKEN?.trim();
    if (!entity) {
      return NextResponse.json(
        { error: "Worldpay is not configured. Set WORLDPAY_ENTITY." },
        { status: 500 }
      );
    }
    let headers: Record<string, string>;
    if (useBasicAuth && basicAuthRaw) {
      headers = {
        Authorization: `Basic ${basicAuthRaw}`,
        Accept: "application/vnd.worldpay.payment_pages-v1.hal+json",
        "Content-Type": "application/vnd.worldpay.payment_pages-v1.hal+json",
      };
    } else if (serviceKey || accountToken) {
      headers = {
        Authorization: `Bearer ${serviceKey || accountToken}`,
        "WP-Entity-Id": entity,
        Accept: "application/vnd.worldpay.payment_pages-v1.hal+json",
        "Content-Type": "application/vnd.worldpay.payment_pages-v1.hal+json",
      };
    } else {
      return NextResponse.json(
        {
          error:
            "Worldpay is not configured. Set WORLD_PAY_SERVICE_KEY, WORLDPAY_ACCOUNT_TOKEN, or WORLDPAY_USE_BASIC_AUTH=true with WORLDPAY_BASIC_AUTH.",
        },
        { status: 500 }
      );
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "";
    const success = successUrl || `${origin}/book-now?worldpay=success&booking_id=${bookingId}&business=${businessId || ""}`;
    const cancel = cancelUrl || `${origin}/book-now?worldpay=cancel&business=${businessId || ""}`;

    const transactionReference = `ORBYT-${bookingId}-${Date.now()}`;
    const amount = Math.round(amountInCents);

    const payload = {
      transactionReference,
      merchant: { entity },
      narrative: { line1: lineItemDescription || "Booking payment" },
      value: { currency: "USD", amount },
      description: lineItemDescription || "Service booking",
      resultURLs: {
        successURL: success,
        cancelURL: cancel,
        failureURL: cancel,
        errorURL: cancel,
        expiryURL: cancel,
        pendingURL: success,
      },
      expiry: 3600,
    };

    const res = await fetch(`${baseUrl}/payment_pages`, {
      method: "POST",
      headers: { ...headers, "WP-CorrelationId": transactionReference.slice(0, 64) },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Worldpay create-checkout error:", res.status, text);
      return NextResponse.json(
        { error: "Worldpay payment setup failed", details: text.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { url?: string };
    const url = data?.url;

    if (!url) {
      console.error("Worldpay response missing url:", data);
      return NextResponse.json(
        { error: "Worldpay did not return a payment URL" },
        { status: 502 }
      );
    }

    return NextResponse.json({ url, sessionId: transactionReference });
  } catch (err) {
    console.error("Worldpay create-checkout-session error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create Worldpay checkout", details: message },
      { status: 500 }
    );
  }
}
