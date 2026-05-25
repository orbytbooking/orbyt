/**
 * Platform billing: businesses pay Orbyt (main Stripe account, not Connect).
 */

export const PLATFORM_SUBSCRIPTION_KIND = "platform_subscription" as const;

/** Checkout before auth user exists; metadata.pending_id → pending_owner_onboarding row. */
export const PLATFORM_PENDING_OWNER_KIND = "pending_owner_onboarding" as const;

/** Map Stripe.Subscription.status to platform_subscriptions.status CHECK values. */
export function mapStripeStatusToDb(
  stripeStatus: string
): "active" | "canceled" | "trialing" | "past_due" {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "active":
    default:
      return "active";
  }
}

/**
 * Resolve Stripe Price ID: DB column platform_subscription_plans.stripe_price_id, else env
 * STRIPE_PLATFORM_PRICE_<SLUG> e.g. STRIPE_PLATFORM_PRICE_GROWTH for slug "growth".
 * Legacy: STRIPE_PLATFORM_PRICE_PRO / STRIPE_PLATFORM_PRICE_ENTERPRISE still work for growth/premium.
 */
export function resolvePlatformStripePriceId(
  planSlug: string,
  planRowStripePriceId: string | null | undefined
): string | null {
  const fromDb = planRowStripePriceId?.trim();
  if (fromDb) return fromDb;
  const normalized = planSlug.toUpperCase().replace(/-/g, "_");
  const key = `STRIPE_PLATFORM_PRICE_${normalized}`;
  const fromEnv = process.env[key]?.trim();
  if (fromEnv) return fromEnv;
  const legacy: Record<string, string | undefined> = {
    growth: process.env.STRIPE_PLATFORM_PRICE_PRO?.trim(),
    premium: process.env.STRIPE_PLATFORM_PRICE_ENTERPRISE?.trim(),
  };
  return legacy[planSlug] || null;
}
