import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Load a Checkout Session the same way createCheckout creates it (direct key vs Connect).
 */
export async function retrieveBookingStripeCheckoutSession(
  sessionId: string,
  businessId: string,
  supabase: SupabaseClient
): Promise<{ session: Stripe.Checkout.Session } | { error: string }> {
  const { data: business, error } = await supabase
    .from("businesses")
    .select("payment_provider, stripe_connect_account_id, stripe_secret_key")
    .eq("id", businessId)
    .single();

  if (error || !business) {
    return { error: "business_not_found" };
  }

  const b = business as {
    payment_provider?: string;
    stripe_connect_account_id?: string | null;
    stripe_secret_key?: string | null;
  };

  if (b.payment_provider === "authorize_net") {
    return { error: "not_stripe_checkout" };
  }

  let stripeConnectAccountId: string | null = b.stripe_connect_account_id ?? null;
  const skRaw = b.stripe_secret_key != null ? String(b.stripe_secret_key).trim() : "";
  const stripeSecretKey = skRaw !== "" ? b.stripe_secret_key : null;

  if (!stripeSecretKey && !stripeConnectAccountId) {
    const { data: fallback } = await supabase
      .from("businesses")
      .select("stripe_connect_account_id")
      .eq("id", businessId)
      .single();
    stripeConnectAccountId =
      (fallback as { stripe_connect_account_id?: string | null } | null)?.stripe_connect_account_id ?? null;
  }

  const secretKey = stripeSecretKey ?? process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return { error: "stripe_not_configured" };
  }

  const stripe = new Stripe(secretKey);
  try {
    const session =
      stripeSecretKey == null && stripeConnectAccountId
        ? await stripe.checkout.sessions.retrieve(sessionId, { stripeAccount: stripeConnectAccountId })
        : await stripe.checkout.sessions.retrieve(sessionId);
    return { session };
  } catch (e) {
    console.error("[retrieveBookingStripeCheckoutSession]", sessionId, e);
    return { error: "stripe_retrieve_failed" };
  }
}
