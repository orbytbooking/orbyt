import { getAuthorizeNetApiUrl } from "@/lib/payments/authorizeNetEnvironment";

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

function parseMaskedLast4(cardNumber: unknown): string | null {
  const s = String(cardNumber ?? "").replace(/\s/g, "");
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 4) return digits.slice(-4);
  const m = s.match(/x+(\d{4})$/i);
  return m ? m[1] : null;
}

function normalizeCardBrand(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower.includes("visa")) return "Visa";
  if (lower.includes("master")) return "Mastercard";
  if (lower.includes("amex") || lower.includes("american")) return "Amex";
  if (lower.includes("discover")) return "Discover";
  if (lower.includes("diners")) return "Diners";
  if (lower.includes("jcb")) return "JCB";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseExpMonthYear(expirationDate: unknown): { expMonth: number | null; expYear: number | null } {
  const s = String(expirationDate ?? "").trim();
  if (!s || /^x+$/i.test(s.replace(/\s/g, ""))) return { expMonth: null, expYear: null };
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    if (y >= 2000 && y <= 2100 && mo >= 1 && mo <= 12) return { expMonth: mo, expYear: y };
  }
  const m2 = s.match(/^(\d{2})\/(\d{2,4})$/);
  if (m2) {
    const mo = parseInt(m2[1], 10);
    let y = parseInt(m2[2], 10);
    if (y < 100) y += 2000;
    if (mo >= 1 && mo <= 12 && y >= 2000 && y <= 2100) return { expMonth: mo, expYear: y };
  }
  return { expMonth: null, expYear: null };
}

export type MerchantTransactionCardSnapshot = {
  responseCode: string;
  transId: string;
  last4: string | null;
  brand: string | null;
  expMonth: number | null;
  expYear: number | null;
};

/**
 * Uses the business's Authorize.Net API credentials (same merchant as Accept Hosted).
 */
export async function fetchMerchantTransactionCardSnapshot(
  apiLoginId: string,
  transactionKey: string,
  transId: string
): Promise<MerchantTransactionCardSnapshot> {
  const id = transId.trim();
  if (!id) throw new Error("transId required");

  const apiUrl = getAuthorizeNetApiUrl();
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      getTransactionDetailsRequest: {
        merchantAuthentication: {
          name: apiLoginId.trim(),
          transactionKey: transactionKey.trim(),
        },
        transId: id,
      },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[Authorize.Net merchant] getTransactionDetails HTTP", res.status, text.slice(0, 400));
    throw new Error(`Authorize.Net HTTP ${res.status}`);
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("Authorize.Net returned invalid JSON");
  }

  const resp =
    (raw as { getTransactionDetailsResponse?: Record<string, unknown> }).getTransactionDetailsResponse ?? raw;
  const messages = resp.messages as AuthNetMessages | undefined;
  throwIfMessagesError(messages, "getTransactionDetails");

  const tx = (resp.transaction ?? (resp as { Transaction?: unknown }).Transaction) as
    | Record<string, unknown>
    | undefined;
  if (!tx) {
    throw new Error("getTransactionDetails: missing transaction");
  }

  const responseCode = String(tx.responseCode ?? tx.response_code ?? "");
  const resolvedTransId = String(tx.transId ?? tx.trans_id ?? id);

  const payment = (tx.payment ?? tx.Payment ?? {}) as Record<string, unknown>;
  const cc = (payment.creditCard ??
    payment.credit_card ??
    (payment as { CreditCard?: unknown }).CreditCard) as Record<string, unknown> | undefined;

  const last4 = cc ? parseMaskedLast4(cc.cardNumber ?? cc.card_number) : null;
  const brand = cc
    ? normalizeCardBrand(cc.cardType ?? cc.card_type ?? cc.accountType ?? cc.account_type)
    : null;
  const expRaw = cc?.expirationDate ?? cc?.expiration_date;
  const { expMonth, expYear } = parseExpMonthYear(expRaw);

  return {
    responseCode,
    transId: resolvedTransId,
    last4,
    brand,
    expMonth,
    expYear,
  };
}
