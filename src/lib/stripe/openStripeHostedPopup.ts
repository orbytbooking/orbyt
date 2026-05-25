/**
 * Stripe Billing Portal (and similar hosted Stripe pages) cannot be embedded like Embedded Checkout.
 * A large centered popup is the closest UX to an in-app modal while keeping the main window on your app.
 */
export function openStripeHostedPopup(url: string, windowName = "stripe_billing_portal"): Window | null {
  const w = Math.min(1280, Math.floor(window.screen.availWidth * 0.92));
  const h = Math.min(900, Math.floor(window.screen.availHeight * 0.9));
  const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
  const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
  const features = [
    `width=${w}`,
    `height=${h}`,
    `left=${left}`,
    `top=${top}`,
    "scrollbars=yes",
    "resizable=yes",
  ].join(",");
  const win = window.open(url, windowName, features);
  if (!win) {
    window.location.assign(url);
    return null;
  }
  try {
    win.focus();
  } catch {
    /* ignore */
  }
  return win;
}
