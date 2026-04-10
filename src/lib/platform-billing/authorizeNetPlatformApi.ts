/**
 * Authorize.Net JSON API for Orbyt platform billing (single merchant account via PLATFORM_* env).
 */

import { getAuthorizeNetApiUrl } from "@/lib/payments/authorizeNetEnvironment";

export type PlatformAuthorizeCredentials = {
  apiLoginId: string;
  transactionKey: string;
};

export function getPlatformAuthorizeCredentials(): PlatformAuthorizeCredentials | null {
  const apiLoginId = process.env.PLATFORM_AUTHORIZE_NET_API_LOGIN_ID?.trim();
  const transactionKey = process.env.PLATFORM_AUTHORIZE_NET_TRANSACTION_KEY?.trim();
  if (!apiLoginId || !transactionKey) return null;
  return { apiLoginId, transactionKey };
}

type AuthNetMessages = {
  resultCode?: string;
  message?: { code?: string; text?: string }[];
};

function throwIfMessagesError(messages: AuthNetMessages | undefined, label: string): void {
  if (messages?.resultCode === "Error") {
    const text =
      messages.message?.map((m) => m.text).filter(Boolean).join("; ") || "Unknown Authorize.Net error";
    throw new Error(`${label}: ${text}`);
  }
}

async function postAuthorizeNetJson(body: unknown): Promise<unknown> {
  const creds = getPlatformAuthorizeCredentials();
  if (!creds) {
    throw new Error("PLATFORM_AUTHORIZE_NET_API_LOGIN_ID / PLATFORM_AUTHORIZE_NET_TRANSACTION_KEY not configured");
  }

  const apiUrl = getAuthorizeNetApiUrl();
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[Platform Authorize.Net] HTTP error:", res.status, text.slice(0, 400));
    throw new Error(`Authorize.Net HTTP ${res.status}`);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    console.error("[Platform Authorize.Net] Non-JSON response:", text.slice(0, 200));
    throw new Error("Authorize.Net returned invalid JSON");
  }
}

function merchantAuth(creds: PlatformAuthorizeCredentials) {
  return {
    name: creds.apiLoginId,
    transactionKey: creds.transactionKey,
  };
}

export type TransactionDetailsParsed = {
  responseCode: string;
  transId: string;
  authAmount: string;
  invoiceNumber: string | null;
  customerProfileId: string | null;
  customerPaymentProfileId: string | null;
};

export async function getAuthorizeNetTransactionDetails(transId: string): Promise<TransactionDetailsParsed> {
  const creds = getPlatformAuthorizeCredentials();
  if (!creds) throw new Error("Platform Authorize.Net credentials missing");

  const raw = await postAuthorizeNetJson({
    getTransactionDetailsRequest: {
      merchantAuthentication: merchantAuth(creds),
      transId,
    },
  }) as Record<string, unknown>;

  const resp =
    (raw as { getTransactionDetailsResponse?: Record<string, unknown> }).getTransactionDetailsResponse ??
    raw;
  const messages = resp.messages as AuthNetMessages | undefined;
  throwIfMessagesError(messages, "getTransactionDetails");

  const tx = (resp.transaction ?? (resp as { Transaction?: unknown }).Transaction) as
    | Record<string, unknown>
    | undefined;
  if (!tx) {
    throw new Error("getTransactionDetails: missing transaction");
  }

  const responseCode = String(tx.responseCode ?? tx.response_code ?? "");
  const id = String(tx.transId ?? tx.trans_id ?? transId);
  const authAmount = String(tx.authAmount ?? tx.settleAmount ?? tx.auth_amount ?? "0");
  const order = (tx.order ?? {}) as Record<string, unknown>;
  const invoiceNumber =
    typeof order.invoiceNumber === "string"
      ? order.invoiceNumber
      : typeof order.invoice_number === "string"
        ? order.invoice_number
        : null;

  const profile = (tx.profile ?? {}) as Record<string, unknown>;
  const customerProfileId =
    typeof profile.customerProfileId === "string"
      ? profile.customerProfileId
      : typeof profile.customerProfileID === "string"
        ? profile.customerProfileID
        : null;
  const customerPaymentProfileId =
    typeof profile.customerPaymentProfileId === "string"
      ? profile.customerPaymentProfileId
      : typeof profile.customerPaymentProfileID === "string"
        ? profile.customerPaymentProfileID
        : null;

  return {
    responseCode,
    transId: id,
    authAmount,
    invoiceNumber,
    customerProfileId,
    customerPaymentProfileId,
  };
}

export async function createAuthorizeNetArbSubscription(params: {
  name: string;
  amountFormatted: string;
  billingInterval: "monthly" | "yearly";
  startDateYyyyMmDd: string;
  customerProfileId: string;
  customerPaymentProfileId: string;
  invoiceNumber: string;
  description: string;
}): Promise<string> {
  const creds = getPlatformAuthorizeCredentials();
  if (!creds) throw new Error("Platform Authorize.Net credentials missing");

  const intervalLength = params.billingInterval === "yearly" ? "12" : "1";
  const intervalUnit = "months";

  const raw = await postAuthorizeNetJson({
    ARBCreateSubscriptionRequest: {
      merchantAuthentication: merchantAuth(creds),
      refId: `orbyt-${Date.now()}`,
      subscription: {
        name: params.name.slice(0, 50),
        paymentSchedule: {
          interval: {
            length: intervalLength,
            unit: intervalUnit,
          },
          startDate: params.startDateYyyyMmDd,
          totalOccurrences: "9999",
        },
        amount: params.amountFormatted,
        profile: {
          customerProfileId: params.customerProfileId,
          customerPaymentProfileId: params.customerPaymentProfileId,
        },
        order: {
          invoiceNumber: params.invoiceNumber.slice(0, 20),
          description: params.description.slice(0, 255),
        },
      },
    },
  }) as Record<string, unknown>;

  const resp =
    (raw as { ARBCreateSubscriptionResponse?: Record<string, unknown> }).ARBCreateSubscriptionResponse ??
    raw;
  const messages = resp.messages as AuthNetMessages | undefined;
  throwIfMessagesError(messages, "ARBCreateSubscription");

  const subId = String(
    (resp as { subscriptionId?: string }).subscriptionId ??
      (resp as { subscription_id?: string }).subscription_id ??
      ""
  ).trim();
  if (!subId) {
    console.error("[Platform Authorize.Net] ARB response missing subscriptionId:", JSON.stringify(resp).slice(0, 500));
    throw new Error("ARBCreateSubscription did not return subscriptionId");
  }
  return subId;
}
