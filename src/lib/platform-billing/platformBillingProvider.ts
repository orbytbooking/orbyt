/**
 * Orbyt SaaS billing: Authorize.Net vs Stripe (platform merchant account, not tenant booking keys).
 */

export type PlatformBillingProvider = "stripe" | "authorize_net";

/**
 * Default workspace billing is **Authorize.Net** (Accept Hosted + ARB).
 * Set `PLATFORM_BILLING_PROVIDER=stripe` to use Stripe Checkout / Customer Portal for platform plans instead.
 */
export function getPlatformBillingProvider(): PlatformBillingProvider {
  const explicit = process.env.PLATFORM_BILLING_PROVIDER?.trim().toLowerCase();
  if (explicit === "stripe") return "stripe";
  return "authorize_net";
}

export function platformAuthorizeNetCredentialsConfigured(): boolean {
  return Boolean(
    process.env.PLATFORM_AUTHORIZE_NET_API_LOGIN_ID?.trim() &&
      process.env.PLATFORM_AUTHORIZE_NET_TRANSACTION_KEY?.trim()
  );
}
