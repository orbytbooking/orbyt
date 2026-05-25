/**
 * Authorize.Net Accept Hosted — `getHostedPaymentPage` token minting.
 *
 * The API does **not** use top-level `returnUrl` / `cancelUrl` on `hostedPaymentSettings`.
 * Those values go inside a single setting:
 *   `hostedPaymentReturnOptions` = JSON string with `{ "url", "cancelUrl", ... }`.
 *
 * @example Minimal request body (see also `buildGetHostedPaymentPageExamplePayload` below)
 * ```json
 * {
 *   "getHostedPaymentPageRequest": {
 *     "merchantAuthentication": { "name": "API_LOGIN_ID", "transactionKey": "TRANSACTION_KEY" },
 *     "refId": "optional-ref",
 *     "transactionRequest": {
 *       "transactionType": "authCaptureTransaction",
 *       "amount": "10.00",
 *       "order": { "invoiceNumber": "INV-1", "description": "Subscription" }
 *     },
 *     "hostedPaymentSettings": {
 *       "setting": [
 *         {
 *           "settingName": "hostedPaymentReturnOptions",
 *           "settingValue": "{\"showReceipt\":true,\"url\":\"https://yoursite.com/return\",\"cancelUrl\":\"https://yoursite.com/cancel\"}"
 *         }
 *       ]
 *     }
 *   }
 * }
 * ```
 *
 * @example Typical success envelope (token is opaque; length varies)
 * ```json
 * {
 *   "token": "eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2R0NNIn0...",
 *   "messages": { "resultCode": "Ok", "message": [{ "code": "I00001", "text": "Successful." }] }
 * }
 * ```
 * (Often wrapped as `{ "getHostedPaymentPageResponse": { "token": "...", "messages": {...} } }`.)
 */

import {
  getAuthorizeNetApiUrl,
  getAuthorizeNetHostedPaymentFormUrl,
  getAuthorizeNetSessionCluster,
  normalizeUrlForAuthorizeNetHostedReturn,
  sanitizeAuthorizeNetOrderText,
} from "@/lib/payments/authorizeNetEnvironment";

export type AuthorizeNetHostedPaymentMessages = {
  resultCode?: string;
  message?: { code?: string; text?: string }[];
};

export type RequestHostedPaymentTokenParams = {
  apiLoginId: string;
  transactionKey: string;
  /** Dollar amount as string, e.g. "19.99" */
  amount: string;
  /** Absolute URL where the payer returns after success (maps to `url` in hostedPaymentReturnOptions). */
  returnUrl: string;
  /** Absolute URL for cancel (maps to `cancelUrl` in hostedPaymentReturnOptions). */
  cancelUrl: string;
  refId?: string;
  order?: {
    invoiceNumber?: string;
    description?: string;
  };
  /** One line item so the hosted order summary renders (avoids empty “Order Summary” + client errors). */
  lineItem?: {
    itemId?: string;
    name: string;
    description?: string;
    quantity: string;
    unitPrice: string;
  };
};

function isSuccessfulResultCode(code: string | undefined): boolean {
  if (!code) return false;
  return code.toLowerCase() === "ok";
}

/**
 * Builds the JSON body for `getHostedPaymentPage` (for docs/tests; same shape as sent over the wire).
 */
export function buildGetHostedPaymentPageRequestBody(params: RequestHostedPaymentTokenParams): unknown {
  const successUrl = normalizeUrlForAuthorizeNetHostedReturn(params.returnUrl.trim());
  const cancelUrl = normalizeUrlForAuthorizeNetHostedReturn(params.cancelUrl.trim());

  const hostedPaymentReturnOptions = JSON.stringify({
    showReceipt: true,
    url: successUrl,
    urlText: "Continue",
    cancelUrl,
    cancelUrlText: "Cancel",
  });

  const lineItemPayload =
    params.lineItem &&
    params.lineItem.name?.trim() &&
    params.lineItem.quantity?.trim() &&
    params.lineItem.unitPrice?.trim()
      ? {
          lineItems: {
            lineItem: [
              {
                itemId: sanitizeAuthorizeNetOrderText(params.lineItem.itemId?.trim() || "1", 31),
                name: sanitizeAuthorizeNetOrderText(params.lineItem.name.trim(), 31),
                ...(params.lineItem.description?.trim()
                  ? {
                      description: sanitizeAuthorizeNetOrderText(params.lineItem.description.trim(), 255),
                    }
                  : {}),
                quantity: params.lineItem.quantity.trim(),
                unitPrice: params.lineItem.unitPrice.trim(),
              },
            ],
          },
        }
      : {};

  return {
    getHostedPaymentPageRequest: {
      merchantAuthentication: {
        name: params.apiLoginId.trim(),
        transactionKey: params.transactionKey.trim(),
      },
      ...(params.refId?.trim() ? { refId: params.refId.trim().slice(0, 20) } : {}),
      transactionRequest: {
        transactionType: "authCaptureTransaction",
        amount: params.amount,
        ...(params.order?.invoiceNumber?.trim() || params.order?.description?.trim()
          ? {
              order: {
                ...(params.order.invoiceNumber?.trim()
                  ? { invoiceNumber: params.order.invoiceNumber.trim().slice(0, 20) }
                  : {}),
                ...(params.order.description?.trim()
                  ? { description: params.order.description.trim().slice(0, 255) }
                  : {}),
              },
            }
          : {}),
        ...lineItemPayload,
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
          {
            settingName: "hostedPaymentPaymentOptions",
            settingValue: JSON.stringify({
              cardCodeRequired: false,
              showCreditCard: true,
              showBankAccount: false,
            }),
          },
        ],
      },
    },
  };
}

/**
 * Calls Authorize.Net JSON API `getHostedPaymentPage`, validates `messages.resultCode === "Ok"`,
 * and returns the opaque hosted token + the matching form POST URL for this environment.
 */
export async function requestAuthorizeNetHostedPaymentToken(
  params: RequestHostedPaymentTokenParams
): Promise<{ token: string; hostedPaymentFormUrl: string; apiUrl: string }> {
  const apiUrl = getAuthorizeNetApiUrl();
  const hostedPaymentFormUrl = getAuthorizeNetHostedPaymentFormUrl();
  const cluster = getAuthorizeNetSessionCluster();

  if (!/^https?:\/\//i.test(params.returnUrl.trim()) || !/^https?:\/\//i.test(params.cancelUrl.trim())) {
    throw new Error(
      "Authorize.Net Accept Hosted requires absolute returnUrl and cancelUrl (http:// or https://)."
    );
  }

  const body = buildGetHostedPaymentPageRequestBody(params);

  console.log("[Authorize.Net Hosted] Minting token", {
    cluster,
    apiUrl,
    hostedPaymentFormUrl,
    amount: params.amount,
    returnUrl: normalizeUrlForAuthorizeNetHostedReturn(params.returnUrl.trim()),
    cancelUrl: normalizeUrlForAuthorizeNetHostedReturn(params.cancelUrl.trim()),
    hasOrder: Boolean(params.order?.invoiceNumber || params.order?.description),
    refId: params.refId?.slice(0, 20) ?? null,
    /** Confirms server is not accidentally in production mode for sandbox keys */
    AUTHORIZE_NET_ENVIRONMENT: process.env.AUTHORIZE_NET_ENVIRONMENT ?? "(unset)",
    /** Lengths only — wrong length often means paste/line-break issues */
    apiLoginIdLength: params.apiLoginId.trim().length,
    transactionKeyLength: params.transactionKey.trim().length,
  });

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    console.error("[Authorize.Net Hosted] Non-JSON response (HTTP", res.status, "):", text.slice(0, 2000));
    throw new Error(`Authorize.Net getHostedPaymentPage: invalid JSON (HTTP ${res.status})`);
  }

  if (!res.ok) {
    console.error("[Authorize.Net Hosted] HTTP error", res.status, "full body:", JSON.stringify(data, null, 2));
    throw new Error(`Authorize.Net getHostedPaymentPage HTTP ${res.status}`);
  }

  const wrapped = data.getHostedPaymentPageResponse as Record<string, unknown> | undefined;
  const resp = (wrapped ?? data) as {
    token?: string;
    messages?: AuthorizeNetHostedPaymentMessages;
  };

  const messages = resp.messages;
  const resultCode = messages?.resultCode;

  if (!isSuccessfulResultCode(resultCode)) {
    console.error(
      "[Authorize.Net Hosted] getHostedPaymentPage failed — full response:",
      JSON.stringify(data, null, 2)
    );
    const errText =
      messages?.message?.map((m) => `${m.code ?? ""}: ${m.text ?? ""}`.trim()).filter(Boolean).join("; ") ||
      `resultCode was "${resultCode ?? "missing"}" (expected Ok)`;
    const authHint =
      errText.includes("E00007") || /invalid authentication/i.test(errText)
        ? " Check PLATFORM_AUTHORIZE_NET_API_LOGIN_ID and PLATFORM_AUTHORIZE_NET_TRANSACTION_KEY (use Transaction Key, not Signature Key). Sandbox keys require AUTHORIZE_NET_ENVIRONMENT unset or not production. Restart npm after .env changes."
        : "";
    throw new Error(`Authorize.Net getHostedPaymentPage: ${errText}${authHint}`);
  }

  const rawToken = resp.token;
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  if (!token) {
    console.error("[Authorize.Net Hosted] Ok response but missing token — full response:", JSON.stringify(data, null, 2));
    throw new Error("Authorize.Net getHostedPaymentPage: token missing in response");
  }

  console.log("[Authorize.Net Hosted] Token minted OK", {
    cluster,
    tokenLength: token.length,
    tokenPrefix: token.slice(0, 12) + "…",
  });

  return { token, hostedPaymentFormUrl, apiUrl };
}

/** Static example for docs / manual Postman tests (replace credentials). */
export function buildGetHostedPaymentPageExamplePayload(): unknown {
  return buildGetHostedPaymentPageRequestBody({
    apiLoginId: "YOUR_API_LOGIN_ID",
    transactionKey: "YOUR_TRANSACTION_KEY",
    amount: "25.00",
    returnUrl: "https://yourapp.com/api/platform/billing/authorize-net/return",
    cancelUrl: "https://yourapp.com/auth/onboarding?anet_cancel=PENDING_UUID",
    refId: "example-ref-001",
    order: {
      invoiceNumber: "a1b2c3d4e5f6a7b8c9d0",
      description: "Orbyt workspace subscription",
    },
    lineItem: {
      itemId: "1",
      name: "Orbyt workspace subscription",
      description: "Orbyt workspace subscription",
      quantity: "1",
      unitPrice: "25.00",
    },
  });
}
