/** Stripe substitutes `{CHECKOUT_SESSION_ID}` in embedded Checkout `return_url`. */
const CHECKOUT_SESSION_PLACEHOLDER = "{CHECKOUT_SESSION_ID}";

/**
 * Ensures the URL contains Stripe's session placeholder so `return_url` is valid for `ui_mode: embedded`.
 */
export function ensureStripeEmbeddedReturnUrl(resolvedUrl: string): string {
  if (resolvedUrl.includes(CHECKOUT_SESSION_PLACEHOLDER)) {
    return resolvedUrl;
  }
  const sep = resolvedUrl.includes("?") ? "&" : "?";
  return `${resolvedUrl}${sep}stripe_session_id=${CHECKOUT_SESSION_PLACEHOLDER}`;
}
