import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const WORLDPAY_TEST_BASE = "https://try.access.worldpay.com";

export type CreateCheckoutParams = {
  bookingId: string;
  amountInCents: number;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
  businessId?: string;
  lineItemDescription?: string;
  origin: string;
};

export type CreateCheckoutResult =
  | { url: string; provider: "stripe"; sessionId: string }
  | { url: string; provider: "worldpay"; sessionId: string };

/**
 * Create a checkout session (Stripe or Worldpay) based on business's payment_provider.
 * Uses supabase to read business; pass existing client to reuse.
 */
export async function createCheckout(
  params: CreateCheckoutParams,
  supabase?: SupabaseClient
): Promise<CreateCheckoutResult> {
  const {
    bookingId,
    amountInCents,
    customerEmail,
    successUrl,
    cancelUrl,
    businessId,
    lineItemDescription,
    origin,
  } = params;

  let paymentProvider: "stripe" | "worldpay" = "stripe";
  let stripeConnectAccountId: string | null = null;

  if (businessId && (supabase ?? (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY))) {
    const client =
      supabase ??
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    const { data: business, error } = await client
      .from("businesses")
      .select("payment_provider, stripe_connect_account_id")
      .eq("id", businessId)
      .single();

    if (!error && business) {
      const b = business as { payment_provider?: string; stripe_connect_account_id?: string | null };
      if (b.payment_provider === "worldpay") {
        paymentProvider = "worldpay";
      } else {
        paymentProvider = "stripe";
        stripeConnectAccountId = b.stripe_connect_account_id ?? null;
      }
    } else {
      // Fallback when payment_provider column doesn't exist yet (migration 056 not run)
      const { data: fallback } = await client
        .from("businesses")
        .select("stripe_connect_account_id")
        .eq("id", businessId)
        .single();
      stripeConnectAccountId = (fallback as { stripe_connect_account_id?: string | null } | null)?.stripe_connect_account_id ?? null;
    }
  }

  if (paymentProvider === "stripe") {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const success =
      successUrl || `${origin}/book-now?stripe=success&session_id={CHECKOUT_SESSION_ID}&business=${businessId || ""}`;
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
      ? await stripe.checkout.sessions.create(sessionParams, { stripeAccount: stripeConnectAccountId })
      : await stripe.checkout.sessions.create(sessionParams);
    return {
      url: session.url!,
      provider: "stripe",
      sessionId: session.id,
    };
  }

  // Worldpay Access Hosted Payments: Bearer + WP-Entity-Id OR Basic (per docs, some accounts use Basic)
  const baseUrl = (process.env.WORLDPAY_BASE_URL || WORLDPAY_TEST_BASE).trim();
  const entity = process.env.WORLDPAY_ENTITY?.trim();
  const useBasicAuth = process.env.WORLDPAY_USE_BASIC_AUTH === "true";
  const basicAuthRaw = process.env.WORLDPAY_BASIC_AUTH?.trim();
  const serviceKey = process.env.WORLD_PAY_SERVICE_KEY?.trim();
  const accountToken = process.env.WORLDPAY_ACCOUNT_TOKEN?.trim();

  if (!entity) {
    throw new Error("Worldpay is not configured. Set WORLDPAY_ENTITY.");
  }
  let authHeader: string;
  let headers: Record<string, string>;
  if (useBasicAuth && basicAuthRaw) {
    authHeader = `Basic ${basicAuthRaw}`;
    headers = {
      Authorization: authHeader,
      "WP-Entity-Id": entity,
      Accept: "application/vnd.worldpay.payment_pages-v1.hal+json",
      "Content-Type": "application/vnd.worldpay.payment_pages-v1.hal+json",
    };
    if (process.env.NODE_ENV === "development") {
      console.log("[Worldpay HPP] Request to", baseUrl, "entity:", entity, "auth: Basic");
    }
  } else {
    const bearerToken = serviceKey || accountToken;
    if (!bearerToken) {
      throw new Error(
        "Worldpay is not configured. Set WORLD_PAY_SERVICE_KEY or WORLDPAY_ACCOUNT_TOKEN (or WORLDPAY_USE_BASIC_AUTH=true and WORLDPAY_BASIC_AUTH)."
      );
    }
    authHeader = `Bearer ${bearerToken}`;
    headers = {
      Authorization: authHeader,
      "WP-Entity-Id": entity,
      Accept: "application/vnd.worldpay.payment_pages-v1.hal+json",
      "Content-Type": "application/vnd.worldpay.payment_pages-v1.hal+json",
    };
    if (process.env.NODE_ENV === "development") {
      console.log("[Worldpay HPP] Request to", baseUrl, "entity:", entity, "auth: Bearer");
    }
  }

  const success = successUrl || `${origin}/book-now?worldpay=success&booking_id=${bookingId}&business=${businessId || ""}`;
  const cancel = cancelUrl || `${origin}/book-now?worldpay=cancel&business=${businessId || ""}`;
  const transactionReference = `ORBYT-${bookingId}-${Date.now()}`;
  const amount = Math.round(amountInCents);
  // Worldpay narrative.line1: max 24 chars, optional chars A-Z a-z 0-9 - . , space
  const narrativeLine1 = (lineItemDescription || "Booking payment")
    .replace(/[^A-Za-z0-9\-., ]/g, " ")
    .trim()
    .slice(0, 24) || "Booking payment";

  const payload = {
    transactionReference,
    merchant: { entity },
    narrative: { line1: narrativeLine1 },
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
    console.error("[Worldpay HPP] Request failed:", res.status, text.slice(0, 500));
    throw new Error(`Worldpay failed (${res.status}): ${text.slice(0, 300)}`);
  }

  let data: { url?: string };
  try {
    data = (await res.json()) as { url?: string };
  } catch (e) {
    console.error("[Worldpay HPP] Invalid JSON response");
    throw new Error("Worldpay returned invalid response");
  }
  const url = data?.url;
  if (!url) {
    console.error("[Worldpay HPP] Response missing url:", data);
    throw new Error("Worldpay did not return a payment URL");
  }

  return { url, provider: "worldpay", sessionId: transactionReference };
}
