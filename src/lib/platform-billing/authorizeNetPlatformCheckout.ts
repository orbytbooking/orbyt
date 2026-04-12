import type { SupabaseClient } from "@supabase/supabase-js";
import {
  cancelUrlSafeForAuthorizeNetAcceptHosted,
  ensureAbsoluteAppBase,
  getAuthorizeNetSessionCluster,
  normalizeUrlForAuthorizeNetHostedReturn,
  sanitizeAuthorizeNetOrderText,
  toAbsoluteHostedPaymentUrl,
} from "@/lib/payments/authorizeNetEnvironment";
import { requestAuthorizeNetHostedPaymentToken } from "@/lib/payments/authorizeNetHostedPaymentToken";
import { getPlatformAuthorizeCredentials } from "@/lib/platform-billing/authorizeNetPlatformApi";

function randomInvoiceToken(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Insert checkout session row and return Accept Hosted redirect URL (via /api/authorize-net/redirect).
 */
export async function startPlatformAuthorizeNetCheckout(params: {
  supabase: SupabaseClient;
  businessId: string | null;
  pendingOwnerId: string | null;
  planSlug: string;
  amountCents: number;
  billingInterval: "monthly" | "yearly";
  lineDescription: string;
  origin: string;
  successReturnPath: string;
  cancelUrl: string;
}): Promise<{ url: string; token: string }> {
  const creds = getPlatformAuthorizeCredentials();
  if (!creds) {
    throw new Error("Platform Authorize.Net credentials are not configured");
  }

  if (!params.businessId && !params.pendingOwnerId) {
    throw new Error("businessId or pendingOwnerId is required");
  }
  if (params.businessId && params.pendingOwnerId) {
    throw new Error("Pass only one of businessId or pendingOwnerId");
  }
  if (params.amountCents <= 0) {
    throw new Error("Plan amount must be greater than zero for Authorize.Net checkout");
  }

  const token = randomInvoiceToken();

  const { error: insErr } = await params.supabase.from("platform_authorize_net_checkout_sessions").insert({
    token,
    business_id: params.businessId,
    pending_owner_id: params.pendingOwnerId,
    plan_slug: params.planSlug,
    amount_cents: params.amountCents,
    billing_interval: params.billingInterval,
  });

  if (insErr) {
    console.error("[Platform Authorize.Net] checkout session insert:", insErr);
    throw new Error(insErr.message);
  }

  /** Prefer request-derived origin first so local checkout is not overridden by a stale NEXT_PUBLIC_APP_URL. */
  const baseApp = normalizeUrlForAuthorizeNetHostedReturn(
    ensureAbsoluteAppBase(
      params.origin?.replace(/\/$/, "").replace(/\r/g, "").trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\r/g, "").replace(/\/$/, "").trim() ||
        ""
    )
  );
  /** Correlate return when the gateway omits transId on GET; single `s` param (no `&`) in the token request. */
  const successPathBase = params.successReturnPath.split("?")[0];
  const successPathWithSession = `${successPathBase}?s=${encodeURIComponent(token)}`;
  const successUrl = normalizeUrlForAuthorizeNetHostedReturn(
    toAbsoluteHostedPaymentUrl(baseApp, successPathWithSession)
  );
  const cancelAbsolute = normalizeUrlForAuthorizeNetHostedReturn(
    toAbsoluteHostedPaymentUrl(baseApp, params.cancelUrl)
  );
  const cancelFallback = params.pendingOwnerId
    ? normalizeUrlForAuthorizeNetHostedReturn(
        toAbsoluteHostedPaymentUrl(
          baseApp,
          `/auth/onboarding?anet_cancel=${encodeURIComponent(params.pendingOwnerId)}`
        )
      )
    : normalizeUrlForAuthorizeNetHostedReturn(
        toAbsoluteHostedPaymentUrl(baseApp, "/admin/settings/account?platform_billing_cancel=1")
      );
  const cancelForHosted = cancelUrlSafeForAuthorizeNetAcceptHosted(cancelAbsolute, cancelFallback);
  for (const [label, u] of [
    ["return url", successUrl],
    ["cancel url", cancelForHosted],
  ] as const) {
    if (!u || !/^https?:\/\//i.test(u.trim())) {
      throw new Error(
        `Authorize.Net ${label} must be an absolute URL starting with http:// or https:// (got "${u ?? ""}"). ` +
          "Set NEXT_PUBLIC_APP_URL=http://localhost:3000 in .env for local dev and restart the server."
      );
    }
  }
  const amount = (params.amountCents / 100).toFixed(2);
  const orderDesc = sanitizeAuthorizeNetOrderText(params.lineDescription, 255);
  const lineName = orderDesc || "Orbyt subscription";

  const { token: hostedToken } = await requestAuthorizeNetHostedPaymentToken({
    apiLoginId: creds.apiLoginId,
    transactionKey: creds.transactionKey,
    amount,
    returnUrl: successUrl,
    cancelUrl: cancelForHosted,
    refId: token.slice(0, 20),
    order: {
      invoiceNumber: token,
      description: orderDesc || "Orbyt subscription",
    },
    lineItem: {
      itemId: "1",
      name: lineName.slice(0, 31),
      description: lineName,
      quantity: "1",
      unitPrice: amount,
    },
  });

  const cluster = getAuthorizeNetSessionCluster();
  const redirectUrl = `${baseApp}/api/authorize-net/redirect?token=${encodeURIComponent(hostedToken)}&anet_env=${encodeURIComponent(cluster)}`;
  return { url: redirectUrl, token };
}
