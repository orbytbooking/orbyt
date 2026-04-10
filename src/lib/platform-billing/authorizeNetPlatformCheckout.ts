import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthorizeNetApiUrl } from "@/lib/payments/authorizeNetEnvironment";
import { getPlatformAuthorizeCredentials } from "@/lib/platform-billing/authorizeNetPlatformApi";

function randomInvoiceToken(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

type AuthNetMessages = {
  resultCode?: string;
  message?: { code?: string; text?: string }[];
};

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

  const baseApp = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || params.origin.replace(/\/$/, "");
  const successUrl = `${baseApp}${params.successReturnPath.startsWith("/") ? "" : "/"}${params.successReturnPath}`;
  const amount = (params.amountCents / 100).toFixed(2);

  const hostedPaymentReturnOptions = JSON.stringify({
    showReceipt: false,
    url: successUrl,
    urlText: "Continue",
    cancelUrl: params.cancelUrl,
    cancelUrlText: "Cancel",
  });

  const requestBody = {
    getHostedPaymentPageRequest: {
      merchantAuthentication: {
        name: creds.apiLoginId,
        transactionKey: creds.transactionKey,
      },
      transactionRequest: {
        transactionType: "authCaptureTransaction",
        amount,
        referenceId: token,
        profile: {
          createProfile: true,
        },
        order: {
          invoiceNumber: token,
          description: params.lineDescription.slice(0, 255),
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

  const apiUrl = getAuthorizeNetApiUrl();
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[Platform Authorize.Net] getHostedPaymentPage HTTP:", res.status, text.slice(0, 400));
    throw new Error(`Authorize.Net getHostedPaymentPage failed (${res.status})`);
  }

  type AuthNetResp = {
    token?: string;
    messages?: AuthNetMessages;
    getHostedPaymentPageResponse?: { token?: string; messages?: AuthNetMessages };
  };
  let data: AuthNetResp;
  try {
    data = JSON.parse(text) as AuthNetResp;
  } catch {
    throw new Error("Authorize.Net returned invalid JSON");
  }

  const resp = data.getHostedPaymentPageResponse ?? data;
  if (resp.messages?.resultCode === "Error") {
    const errText =
      resp.messages.message?.map((m) => m.text).filter(Boolean).join("; ") ?? "Unknown error";
    throw new Error(`Authorize.Net: ${errText}`);
  }

  const hostedToken = resp.token ?? data.token;
  if (!hostedToken) {
    throw new Error("Authorize.Net did not return a payment token");
  }

  const redirectUrl = `${baseApp}/api/authorize-net/redirect?token=${encodeURIComponent(hostedToken)}`;
  return { url: redirectUrl, token };
}
