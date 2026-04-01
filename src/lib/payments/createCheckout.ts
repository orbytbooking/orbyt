import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export type CreateCheckoutParams = {
  /** Existing booking row (admin charges, Authorize.net book-now, legacy Stripe). */
  bookingId?: string;
  /** Deferred book-now: create booking only after Stripe payment succeeds. */
  pendingStripeBookingIntentId?: string;
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
  | { url: string; provider: "authorize_net"; sessionId: string };

/**
 * Create a checkout session (Stripe or Authorize.net) based on business's payment_provider.
 * Uses supabase to read business; pass existing client to reuse.
 */
export async function createCheckout(
  params: CreateCheckoutParams,
  supabase?: SupabaseClient
): Promise<CreateCheckoutResult> {
  const {
    bookingId,
    pendingStripeBookingIntentId,
    amountInCents,
    customerEmail,
    successUrl,
    cancelUrl,
    businessId,
    lineItemDescription,
    origin,
  } = params;

  if (!bookingId && !pendingStripeBookingIntentId) {
    throw new Error("Either bookingId or pendingStripeBookingIntentId is required");
  }
  if (bookingId && pendingStripeBookingIntentId) {
    throw new Error("Pass only one of bookingId or pendingStripeBookingIntentId");
  }

  let paymentProvider: "stripe" | "authorize_net" = "stripe";
  let stripeConnectAccountId: string | null = null;
  let stripeSecretKey: string | null = null;
  let authorizeNetApiLoginId: string | null = null;
  let authorizeNetTransactionKey: string | null = null;

  if (businessId && (supabase ?? (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY))) {
    const client =
      supabase ??
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    const { data: business, error } = await client
      .from("businesses")
      .select("payment_provider, stripe_connect_account_id, stripe_secret_key, authorize_net_api_login_id, authorize_net_transaction_key")
      .eq("id", businessId)
      .single();

    if (!error && business) {
      const b = business as {
        payment_provider?: string;
        stripe_connect_account_id?: string | null;
        stripe_secret_key?: string | null;
        authorize_net_api_login_id?: string | null;
        authorize_net_transaction_key?: string | null;
      };
      if (b.payment_provider === "authorize_net" && b.authorize_net_api_login_id && b.authorize_net_transaction_key) {
        paymentProvider = "authorize_net";
        authorizeNetApiLoginId = b.authorize_net_api_login_id;
        authorizeNetTransactionKey = b.authorize_net_transaction_key;
      } else {
        paymentProvider = "stripe";
        stripeConnectAccountId = b.stripe_connect_account_id ?? null;
        const sk = b.stripe_secret_key != null ? String(b.stripe_secret_key).trim() : "";
        stripeSecretKey = sk !== "" ? b.stripe_secret_key : null;
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
    const secretKey = stripeSecretKey ?? process.env.STRIPE_SECRET_KEY!;
    const stripe = new Stripe(secretKey);
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
        ...(pendingStripeBookingIntentId
          ? { pending_stripe_booking_id: String(pendingStripeBookingIntentId) }
          : { booking_id: String(bookingId) }),
        ...(businessId ? { business_id: String(businessId) } : {}),
      },
    };
    const session =
      stripeSecretKey == null && stripeConnectAccountId
        ? await stripe.checkout.sessions.create(sessionParams, { stripeAccount: stripeConnectAccountId })
        : await stripe.checkout.sessions.create(sessionParams);

    if (pendingStripeBookingIntentId && businessId) {
      const client =
        supabase ??
        createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { error: linkErr } = await client
        .from("pending_stripe_booking_intents")
        .update({ stripe_checkout_session_id: session.id })
        .eq("id", pendingStripeBookingIntentId)
        .eq("business_id", businessId);
      if (linkErr) {
        console.error("[createCheckout] failed to link Stripe session to pending intent:", linkErr);
      }
    }

    return {
      url: session.url!,
      provider: "stripe",
      sessionId: session.id,
    };
  }

  if (paymentProvider === "authorize_net") {
    if (!authorizeNetApiLoginId || !authorizeNetTransactionKey) {
      throw new Error("Authorize.net is selected but credentials are not configured. Add API Login ID and Transaction Key in Billing settings.");
    }
    return createAuthorizeNetCheckout({
      apiLoginId: authorizeNetApiLoginId,
      transactionKey: authorizeNetTransactionKey,
      bookingId,
      amountInCents,
      lineItemDescription,
      origin,
      businessId,
    });
  }

  // Fallback to Stripe (e.g. if payment_provider was worldpay before migration)
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
          product_data: { name: "Booking payment", description: lineItemDescription || "Service booking", images: [] },
        },
        quantity: 1,
      },
    ],
    success_url: success,
    cancel_url: cancel,
    customer_email: customerEmail || undefined,
    metadata: {
      ...(pendingStripeBookingIntentId
        ? { pending_stripe_booking_id: String(pendingStripeBookingIntentId) }
        : { booking_id: String(bookingId) }),
      ...(businessId ? { business_id: String(businessId) } : {}),
    },
  };
  const session = stripeConnectAccountId
    ? await stripe.checkout.sessions.create(sessionParams, { stripeAccount: stripeConnectAccountId })
    : await stripe.checkout.sessions.create(sessionParams);

  if (pendingStripeBookingIntentId && businessId) {
    const client =
      supabase ??
      createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    await client
      .from("pending_stripe_booking_intents")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", pendingStripeBookingIntentId)
      .eq("business_id", businessId);
  }

  return { url: session.url!, provider: "stripe", sessionId: session.id };
}

const AUTHORIZE_NET_SANDBOX_API = "https://apitest.authorize.net/xml/v1/request.api";
const AUTHORIZE_NET_PROD_API = "https://api.authorize.net/xml/v1/request.api";

async function createAuthorizeNetCheckout(params: {
  apiLoginId: string;
  transactionKey: string;
  bookingId: string;
  amountInCents: number;
  lineItemDescription?: string;
  origin: string;
  businessId?: string;
}): Promise<{ url: string; provider: "authorize_net"; sessionId: string }> {
  const {
    apiLoginId,
    transactionKey,
    bookingId,
    amountInCents,
    lineItemDescription,
    origin,
    businessId,
  } = params;

  const useSandbox = process.env.AUTHORIZE_NET_ENVIRONMENT !== "production";
  const apiUrl = useSandbox ? AUTHORIZE_NET_SANDBOX_API : AUTHORIZE_NET_PROD_API;

  const successUrl = `${origin}/book-now?authorize_net=success&booking_id=${bookingId}&business=${businessId || ""}`;
  const cancelUrl = `${origin}/book-now?authorize_net=cancel&business=${businessId || ""}`;

  const amount = (Math.round(amountInCents) / 100).toFixed(2);
  const transactionRef = `ORBYT-${bookingId}-${Date.now()}`;

  const hostedPaymentReturnOptions = JSON.stringify({
    showReceipt: false,
    url: successUrl,
    urlText: "Continue",
    cancelUrl,
    cancelUrlText: "Cancel",
  });

  const requestBody = {
    getHostedPaymentPageRequest: {
      merchantAuthentication: {
        name: apiLoginId,
        transactionKey,
      },
      transactionRequest: {
        transactionType: "authCaptureTransaction",
        amount,
        referenceId: transactionRef.slice(0, 20),
        order: {
          invoiceNumber: transactionRef.slice(0, 20),
          description: (lineItemDescription || "Booking payment").slice(0, 255),
        },
      },
      hostedPaymentSettings: {
        setting: [
          {
            settingName: "hostedPaymentReturnOptions",
            settingValue: hostedPaymentReturnOptions,
          },
          {
            settingName: "hostedPaymentButtonOptions",
            settingValue: JSON.stringify({ text: "Pay" }),
          },
        ],
      },
    },
  };

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[Authorize.net] Request failed:", res.status, text.slice(0, 500));
    throw new Error(`Authorize.net failed (${res.status}): ${text.slice(0, 300)}`);
  }

  type AuthNetMessages = { resultCode?: string; message?: { code?: string; text?: string }[] };
  type AuthNetResp = { token?: string; messages?: AuthNetMessages; getHostedPaymentPageResponse?: { token?: string; messages?: AuthNetMessages } };
  let data: AuthNetResp;
  try {
    data = JSON.parse(text) as AuthNetResp;
  } catch {
    console.error("[Authorize.net] Invalid JSON response:", text.slice(0, 200));
    throw new Error("Authorize.net returned invalid response");
  }

  const resp = data.getHostedPaymentPageResponse ?? data;
  const messages = resp.messages;
  if (messages?.resultCode === "Error") {
    const errText = messages.message?.map((m) => m.text).filter(Boolean).join("; ") ?? "Unknown error";
    console.error("[Authorize.net] API error:", errText);
    throw new Error(`Authorize.net: ${errText}`);
  }

  const token = resp.token ?? data.token;
  if (!token) {
    console.error("[Authorize.net] Response missing token:", data);
    throw new Error("Authorize.net did not return a payment token");
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
  const redirectUrl = `${baseUrl}/api/authorize-net/redirect?token=${encodeURIComponent(token)}`;

  return {
    url: redirectUrl,
    provider: "authorize_net",
    sessionId: transactionRef,
  };
}
