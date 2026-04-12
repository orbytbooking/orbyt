/**
 * Authorize.Net JSON API for Orbyt platform billing (single merchant account via PLATFORM_* env).
 */

import { getAuthorizeNetApiUrl } from "@/lib/payments/authorizeNetEnvironment";

export type PlatformAuthorizeCredentials = {
  apiLoginId: string;
  transactionKey: string;
};

function cleanEnvSecret(raw: string | undefined): string {
  if (raw == null) return "";
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

export function getPlatformAuthorizeCredentials(): PlatformAuthorizeCredentials | null {
  const apiLoginId = cleanEnvSecret(process.env.PLATFORM_AUTHORIZE_NET_API_LOGIN_ID);
  const transactionKey = cleanEnvSecret(process.env.PLATFORM_AUTHORIZE_NET_TRANSACTION_KEY);
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

function isAuthNetResultOk(messages: AuthNetMessages | undefined): boolean {
  const rc = (messages?.resultCode ?? "").trim();
  if (!rc) return true;
  return rc.toLowerCase() === "ok";
}

/** Normalize reporting list shapes (JSON sometimes uses `transactions: []` or `transactions: { transaction: [...] }`). */
function normalizeReportingTransactionRows(resp: Record<string, unknown>): Record<string, unknown>[] {
  const txs =
    resp.transactions ?? (resp as { Transactions?: unknown }).Transactions ?? resp.transaction ?? resp.Transaction;
  if (Array.isArray(txs)) return txs as Record<string, unknown>[];
  if (txs && typeof txs === "object" && !Array.isArray(txs)) {
    const inner = (txs as Record<string, unknown>).transaction ?? (txs as Record<string, unknown>).Transaction;
    if (Array.isArray(inner)) return inner as Record<string, unknown>[];
    if (inner && typeof inner === "object") return [inner as Record<string, unknown>];
  }
  return [];
}

function findTransIdMatchingInvoice(rows: Record<string, unknown>[], invoice: string): string | null {
  const inv = invoice.trim();
  for (const row of rows) {
    const rowInv = String(row.invoiceNumber ?? row.invoice_number ?? "").trim();
    if (rowInv === inv) {
      const id = String(row.transId ?? row.trans_id ?? "").trim();
      if (id) return id;
    }
  }
  return null;
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

/**
 * Accept Hosted sometimes returns to the merchant URL without a transaction id in the query string.
 * Unsettled list includes `invoiceNumber` — we set that to the checkout session token in getHostedPaymentPage.
 */
export async function findUnsettledTransIdByInvoiceNumber(invoiceNumber: string): Promise<string | null> {
  const creds = getPlatformAuthorizeCredentials();
  if (!creds) return null;
  const inv = invoiceNumber.trim();
  if (!inv) return null;

  let raw: Record<string, unknown>;
  try {
    raw = (await postAuthorizeNetJson({
      getUnsettledTransactionListRequest: {
        merchantAuthentication: merchantAuth(creds),
      },
    })) as Record<string, unknown>;
  } catch (e) {
    console.error("[Platform Authorize.Net] getUnsettledTransactionList failed:", e);
    return null;
  }

  const resp =
    (raw as { getUnsettledTransactionListResponse?: Record<string, unknown> }).getUnsettledTransactionListResponse ??
    raw;
  const messages = resp.messages as AuthNetMessages | undefined;
  if (!isAuthNetResultOk(messages)) {
    return null;
  }

  const rows = normalizeReportingTransactionRows(resp);
  return findTransIdMatchingInvoice(rows, inv);
}

/**
 * After capture, sandbox/production may move the charge out of the unsettled list quickly.
 * Scan recent settled batches (same invoice # as checkout session token).
 */
export async function findTransIdByInvoiceInRecentSettledBatches(
  invoiceNumber: string,
  options?: { maxBatches?: number; dayRange?: number }
): Promise<string | null> {
  const creds = getPlatformAuthorizeCredentials();
  if (!creds) return null;
  const inv = invoiceNumber.trim();
  if (!inv) return null;

  const maxBatches = options?.maxBatches ?? 40;
  const dayRange = Math.min(Math.max(options?.dayRange ?? 14, 1), 31);

  const end = new Date();
  const start = new Date(end.getTime() - dayRange * 24 * 60 * 60 * 1000);
  const firstSettlementDate = start.toISOString().replace(/\.\d{3}Z$/, "Z");
  const lastSettlementDate = end.toISOString().replace(/\.\d{3}Z$/, "Z");

  let batchRaw: Record<string, unknown>;
  try {
    batchRaw = (await postAuthorizeNetJson({
      getSettledBatchListRequest: {
        merchantAuthentication: merchantAuth(creds),
        firstSettlementDate,
        lastSettlementDate,
      },
    })) as Record<string, unknown>;
  } catch (e) {
    console.error("[Platform Authorize.Net] getSettledBatchList failed:", e);
    return null;
  }

  const bResp =
    (batchRaw as { getSettledBatchListResponse?: Record<string, unknown> }).getSettledBatchListResponse ?? batchRaw;
  if (!isAuthNetResultOk(bResp.messages as AuthNetMessages)) {
    return null;
  }

  const bl = bResp.batchList as Record<string, unknown> | undefined;
  const batchesRaw = bl?.batch ?? bl?.Batch ?? bResp.batch;
  const batches: Record<string, unknown>[] = Array.isArray(batchesRaw)
    ? (batchesRaw as Record<string, unknown>[])
    : batchesRaw && typeof batchesRaw === "object"
      ? [batchesRaw as Record<string, unknown>]
      : [];

  const sorted = [...batches].sort((a, b) => {
    const ta = String(a.settlementTimeUTC ?? a.settlementTimeUtc ?? "");
    const tb = String(b.settlementTimeUTC ?? b.settlementTimeUtc ?? "");
    return tb.localeCompare(ta);
  });

  for (const batch of sorted.slice(0, maxBatches)) {
    const batchId = String(batch.batchId ?? batch.batch_id ?? "").trim();
    if (!batchId) continue;

    let txRaw: Record<string, unknown>;
    try {
      txRaw = (await postAuthorizeNetJson({
        getTransactionListRequest: {
          merchantAuthentication: merchantAuth(creds),
          batchId,
        },
      })) as Record<string, unknown>;
    } catch {
      continue;
    }

    const txResp =
      (txRaw as { getTransactionListResponse?: Record<string, unknown> }).getTransactionListResponse ?? txRaw;
    if (!isAuthNetResultOk(txResp.messages as AuthNetMessages)) {
      continue;
    }

    const rows = normalizeReportingTransactionRows(txResp);
    const found = findTransIdMatchingInvoice(rows, inv);
    if (found) {
      return found;
    }
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Accept Hosted often redirects with only our session token (`?s=`) and no `transId`. Reporting can lag
 * by seconds: unsettled list may be empty on the first poll, then populate. We poll with backoff before
 * giving up (reduces intermittent "refresh this page" failures).
 */
export async function resolveTransIdForPlatformCheckoutSession(invoiceNumber: string): Promise<string | null> {
  const inv = invoiceNumber.trim();
  if (!inv) return null;

  /** ~8–10s total wait + API time; balances Authorize.Net reporting lag vs serverless timeouts. */
  const phases = 10;
  const last = phases - 1;

  for (let i = 0; i < phases; i++) {
    if (i > 0) {
      await sleep(Math.min(280 + i * 200, 2000));
    }

    const u = await findUnsettledTransIdByInvoiceNumber(inv);
    if (u) {
      if (i > 0) {
        console.log("[Platform Authorize.Net] transId resolved from unsettled after poll", {
          attempt: i + 1,
          invoicePrefix: inv.slice(0, 8),
        });
      }
      return u;
    }

    const runSettled =
      i >= 2 && (i % 3 === 2 || i === last);
    if (runSettled) {
      const s = await findTransIdByInvoiceInRecentSettledBatches(inv, {
        maxBatches: i === last ? 40 : 14,
      });
      if (s) {
        console.log("[Platform Authorize.Net] transId resolved from settled batches after poll", {
          attempt: i + 1,
          invoicePrefix: inv.slice(0, 8),
        });
        return s;
      }
    }
  }

  return null;
}

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

/**
 * After a successful Accept Hosted charge **without** `createProfile` on the hosted request,
 * create the CIM customer + default payment profile from the transaction (required for ARB).
 */
export async function createCustomerProfileFromTransaction(params: {
  transId: string;
  customerEmail?: string | null;
}): Promise<{ customerProfileId: string; customerPaymentProfileId: string }> {
  const creds = getPlatformAuthorizeCredentials();
  if (!creds) throw new Error("Platform Authorize.Net credentials missing");

  /** `customer` here is not customerProfileBaseType — schema allows only a subset (e.g. email), not `description`. */
  const customer: Record<string, string> = {};
  const email = params.customerEmail?.trim();
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    customer.email = email;
  }

  const raw = (await postAuthorizeNetJson({
    createCustomerProfileFromTransactionRequest: {
      merchantAuthentication: merchantAuth(creds),
      transId: params.transId,
      ...(Object.keys(customer).length > 0 ? { customer } : {}),
    },
  })) as Record<string, unknown>;

  const resp =
    (raw as { createCustomerProfileFromTransactionResponse?: Record<string, unknown> })
      .createCustomerProfileFromTransactionResponse ?? raw;
  const messages = resp.messages as AuthNetMessages | undefined;
  throwIfMessagesError(messages, "createCustomerProfileFromTransaction");

  const customerProfileId = String(resp.customerProfileId ?? "").trim();
  const list = resp.customerPaymentProfileIdList as unknown;
  let customerPaymentProfileId = "";

  if (Array.isArray(list) && list.length > 0) {
    const first = list[0] as string | { numericString?: string };
    customerPaymentProfileId =
      typeof first === "string" ? first : String(first?.numericString ?? "").trim();
  }
  if (!customerPaymentProfileId) {
    customerPaymentProfileId = String(
      resp.customerPaymentProfileId ?? resp.customerPaymentProfileID ?? ""
    ).trim();
  }

  if (!customerProfileId || !customerPaymentProfileId) {
    console.error(
      "[Platform Authorize.Net] createCustomerProfileFromTransaction unexpected response:",
      JSON.stringify(resp).slice(0, 800)
    );
    throw new Error("createCustomerProfileFromTransaction: missing customer or payment profile id");
  }

  return { customerProfileId, customerPaymentProfileId };
}

export async function createAuthorizeNetArbSubscription(params: {
  name: string;
  amountFormatted: string;
  billingInterval: "monthly" | "yearly";
  startDateYyyyMmDd: string;
  customerProfileId: string;
  customerPaymentProfileId: string;
}): Promise<string> {
  const creds = getPlatformAuthorizeCredentials();
  if (!creds) throw new Error("Platform Authorize.Net credentials missing");

  const intervalLength = params.billingInterval === "yearly" ? "12" : "1";
  const intervalUnit = "months";

  /** ARB `subscription` type does not allow an `order` child (AnetApiSchema.xsd). Invoice/plan context stays in Orbyt DB. */
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
