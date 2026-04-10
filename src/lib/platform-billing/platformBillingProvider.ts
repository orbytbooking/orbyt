/**
 * Orbyt SaaS billing: Stripe vs Authorize.Net (platform merchant account, not tenant booking keys).
 */

export type PlatformBillingProvider = "stripe" | "authorize_net";

/**
 * Set PLATFORM_BILLING_PROVIDER=authorize_net to charge workspace plans via Authorize.Net (ARB + Accept Hosted).
 * When unset, defaults to stripe unless only Authorize credentials exist (see implementation).
 */
export function getPlatformBillingProvider(): PlatformBillingProvider {
  const explicit = process.env.PLATFORM_BILLING_PROVIDER?.trim().toLowerCase();
  if (explicit === "authorize_net") return "authorize_net";
  if (explicit === "stripe") return "stripe";

  const login = process.env.PLATFORM_AUTHORIZE_NET_API_LOGIN_ID?.trim();
  const key = process.env.PLATFORM_AUTHORIZE_NET_TRANSACTION_KEY?.trim();
  if (login && key) return "authorize_net";

  return "stripe";
}

export function platformAuthorizeNetCredentialsConfigured(): boolean {
  return Boolean(
    process.env.PLATFORM_AUTHORIZE_NET_API_LOGIN_ID?.trim() &&
      process.env.PLATFORM_AUTHORIZE_NET_TRANSACTION_KEY?.trim()
  );
}
