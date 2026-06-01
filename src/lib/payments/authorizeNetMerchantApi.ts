import type { AuthorizeNetSessionCluster } from "@/lib/payments/authorizeNetEnvironment";
import {
  getAcceptJsScriptUrlForCluster,
  getAuthorizeNetApiUrlForCluster,
} from "@/lib/payments/authorizeNetEnvironment";

export type MerchantAuthorizeCredentials = {
  apiLoginId: string;
  transactionKey: string;
};

type AuthNetMessages = {
  resultCode?: string;
  message?: { code?: string; text?: string }[];
};

export type AuthorizeNetOpaqueData = {
  dataDescriptor: string;
  dataValue: string;
};

type AuthorizeNetBillTo = {
  firstName: string;
  lastName: string;
};

function cleanSecret(raw: string | undefined | null): string {
  if (raw == null) return "";
  return raw
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function buildAuthorizeNetProfileEmail(rawEmail: string | undefined | null, merchantCustomerId: string): string {
  const email = cleanSecret(rawEmail);
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return email;
  }
  const compactId = merchantCustomerId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24) || "customer";
  // Some admin-created customers do not have email yet; CIM createCustomerProfile expects a valid email.
  return `customer-${compactId}@example.com`;
}

function buildAuthorizeNetBillTo(
  rawFirstName: string | undefined | null,
  rawLastName: string | undefined | null,
  merchantCustomerId: string
): AuthorizeNetBillTo {
  const firstName = cleanSecret(rawFirstName).slice(0, 50);
  const lastName = cleanSecret(rawLastName).slice(0, 50);
  if (firstName && lastName) return { firstName, lastName };
  if (firstName) return { firstName, lastName: "Customer" };
  if (lastName) return { firstName: "Customer", lastName };
  const compactId = merchantCustomerId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20) || "Customer";
  return { firstName: "Customer", lastName: compactId };
}

function merchantAuth(creds: MerchantAuthorizeCredentials) {
  return {
    name: creds.apiLoginId.trim(),
    transactionKey: creds.transactionKey.trim(),
  };
}

function throwIfMessagesError(messages: AuthNetMessages | undefined, label: string): void {
  if (messages?.resultCode === "Error") {
    const text =
      messages.message
        ?.map((m) => {
          const code = String(m.code ?? "").trim();
          const msg = String(m.text ?? "").trim();
          if (code && msg) return `${code}: ${msg}`;
          return code || msg;
        })
        .filter(Boolean)
        .join("; ") || "Unknown Authorize.Net error";
    throw new Error(`${label}: ${text}`);
  }
}

function getValidationMode(cluster: AuthorizeNetSessionCluster): "testMode" | "liveMode" {
  // For CIM profile creation, liveMode is strict and often fails for admin-entered cards
  // without full AVS fields (zip/address) or when using non-chargeable test numbers.
  // We only need to vault here; real authorization/validation happens when charging.
  return "testMode";
}

async function postMerchantAuthorizeNetJson(
  creds: MerchantAuthorizeCredentials,
  body: unknown,
  cluster: AuthorizeNetSessionCluster
): Promise<Record<string, unknown>> {
  const apiUrl = getAuthorizeNetApiUrlForCluster(cluster);
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[Authorize.Net merchant] HTTP error:", res.status, text.slice(0, 400));
    throw new Error(`Authorize.Net HTTP ${res.status}`);
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("Authorize.Net returned invalid JSON");
  }
}

function parsePaymentProfileIdList(resp: Record<string, unknown>): string {
  const list = resp.customerPaymentProfileIdList as unknown;
  if (Array.isArray(list) && list.length > 0) {
    const first = list[0] as string | { numericString?: string };
    return typeof first === "string" ? first.trim() : String(first?.numericString ?? "").trim();
  }
  return String(resp.customerPaymentProfileId ?? resp.customerPaymentProfileID ?? "").trim();
}

function parseMaskedLast4(cardNumber: unknown): string | null {
  const digits = String(cardNumber ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
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
  const iso = s.match(/^(\d{4})-(\d{2})$/);
  if (iso) {
    const y = parseInt(iso[1], 10);
    const mo = parseInt(iso[2], 10);
    if (y >= 2000 && y <= 2100 && mo >= 1 && mo <= 12) return { expMonth: mo, expYear: y };
  }
  const slash = s.match(/^(\d{2})\/(\d{2,4})$/);
  if (slash) {
    const mo = parseInt(slash[1], 10);
    let y = parseInt(slash[2], 10);
    if (y < 100) y += 2000;
    if (mo >= 1 && mo <= 12 && y >= 2000 && y <= 2100) return { expMonth: mo, expYear: y };
  }
  return { expMonth: null, expYear: null };
}

export function getAcceptJsScriptUrl(cluster: AuthorizeNetSessionCluster): string {
  return getAcceptJsScriptUrlForCluster(cluster);
}

export async function getCustomerPaymentProfileSnapshot(
  creds: MerchantAuthorizeCredentials,
  customerProfileId: string,
  customerPaymentProfileId: string,
  cluster: AuthorizeNetSessionCluster
): Promise<{ last4: string | null; brand: string | null; expMonth: number | null; expYear: number | null }> {
  const raw = await postMerchantAuthorizeNetJson(
    creds,
    {
      getCustomerPaymentProfileRequest: {
        merchantAuthentication: merchantAuth(creds),
        customerProfileId,
        customerPaymentProfileId,
      },
    },
    cluster
  );

  const resp =
    (raw as { getCustomerPaymentProfileResponse?: Record<string, unknown> }).getCustomerPaymentProfileResponse ??
    raw;
  throwIfMessagesError(resp.messages as AuthNetMessages | undefined, "getCustomerPaymentProfile");

  const profile = (resp.paymentProfile ?? resp.PaymentProfile) as Record<string, unknown> | undefined;
  const payment = (profile?.payment ?? profile?.Payment ?? {}) as Record<string, unknown>;
  const cc = (payment.creditCard ??
    payment.credit_card ??
    (payment as { CreditCard?: unknown }).CreditCard) as Record<string, unknown> | undefined;

  const last4 = cc ? parseMaskedLast4(cc.cardNumber ?? cc.card_number) : null;
  const brand = cc
    ? normalizeCardBrand(cc.cardType ?? cc.card_type ?? cc.accountType ?? cc.account_type)
    : null;
  const { expMonth, expYear } = parseExpMonthYear(cc?.expirationDate ?? cc?.expiration_date);

  return { last4, brand, expMonth, expYear };
}

export async function createMerchantCustomerPaymentProfile(params: {
  creds: MerchantAuthorizeCredentials;
  customerProfileId: string;
  opaqueData: AuthorizeNetOpaqueData;
  firstName?: string | null;
  lastName?: string | null;
  cluster: AuthorizeNetSessionCluster;
}): Promise<{ customerPaymentProfileId: string }> {
  const billTo = buildAuthorizeNetBillTo(params.firstName, params.lastName, params.customerProfileId);
  const raw = await postMerchantAuthorizeNetJson(
    params.creds,
    {
      createCustomerPaymentProfileRequest: {
        merchantAuthentication: merchantAuth(params.creds),
        customerProfileId: params.customerProfileId,
        paymentProfile: {
          customerType: "individual",
          billTo,
          payment: {
            opaqueData: {
              dataDescriptor: params.opaqueData.dataDescriptor,
              dataValue: params.opaqueData.dataValue,
            },
          },
        },
        validationMode: getValidationMode(params.cluster),
      },
    },
    params.cluster
  );

  const resp =
    (raw as { createCustomerPaymentProfileResponse?: Record<string, unknown> })
      .createCustomerPaymentProfileResponse ?? raw;
  throwIfMessagesError(resp.messages as AuthNetMessages | undefined, "createCustomerPaymentProfile");

  const customerPaymentProfileId = parsePaymentProfileIdList(resp);
  if (!customerPaymentProfileId) {
    throw new Error("createCustomerPaymentProfile: missing customerPaymentProfileId");
  }

  return { customerPaymentProfileId };
}

export async function createMerchantCustomerProfileWithPayment(params: {
  creds: MerchantAuthorizeCredentials;
  merchantCustomerId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  opaqueData: AuthorizeNetOpaqueData;
  cluster: AuthorizeNetSessionCluster;
}): Promise<{ customerProfileId: string; customerPaymentProfileId: string }> {
  const merchantCustomerId = params.merchantCustomerId.slice(0, 20);
  const billTo = buildAuthorizeNetBillTo(params.firstName, params.lastName, merchantCustomerId);
  const profile: Record<string, unknown> = {
    merchantCustomerId,
  };

  const email = buildAuthorizeNetProfileEmail(params.email, merchantCustomerId);
  // Authorize.Net CIM schema is order-sensitive: email must appear before paymentProfiles.
  profile.email = email;

  profile.paymentProfiles = [
    {
      customerType: "individual",
      billTo,
      payment: {
        opaqueData: {
          dataDescriptor: params.opaqueData.dataDescriptor,
          dataValue: params.opaqueData.dataValue,
        },
      },
    },
  ];

  const raw = await postMerchantAuthorizeNetJson(
    params.creds,
    {
      createCustomerProfileRequest: {
        merchantAuthentication: merchantAuth(params.creds),
        profile,
        validationMode: getValidationMode(params.cluster),
      },
    },
    params.cluster
  );

  const resp =
    (raw as { createCustomerProfileResponse?: Record<string, unknown> }).createCustomerProfileResponse ?? raw;
  throwIfMessagesError(resp.messages as AuthNetMessages | undefined, "createCustomerProfile");

  const customerProfileId = String(resp.customerProfileId ?? "").trim();
  const customerPaymentProfileId = parsePaymentProfileIdList(resp);

  if (!customerProfileId || !customerPaymentProfileId) {
    throw new Error("createCustomerProfile: missing customer or payment profile id");
  }

  return { customerProfileId, customerPaymentProfileId };
}

export async function vaultMerchantCustomerCard(params: {
  creds: MerchantAuthorizeCredentials;
  cluster: AuthorizeNetSessionCluster;
  existingCustomerProfileId?: string | null;
  merchantCustomerId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  opaqueData: AuthorizeNetOpaqueData;
}): Promise<{ customerProfileId: string; customerPaymentProfileId: string }> {
  const existing = cleanSecret(params.existingCustomerProfileId);
  if (existing) {
    const created = await createMerchantCustomerPaymentProfile({
      creds: params.creds,
      customerProfileId: existing,
      opaqueData: params.opaqueData,
      firstName: params.firstName,
      lastName: params.lastName,
      cluster: params.cluster,
    });
    return { customerProfileId: existing, customerPaymentProfileId: created.customerPaymentProfileId };
  }

  return createMerchantCustomerProfileWithPayment({
    creds: params.creds,
    merchantCustomerId: params.merchantCustomerId,
    email: params.email,
    firstName: params.firstName,
    lastName: params.lastName,
    opaqueData: params.opaqueData,
    cluster: params.cluster,
  });
}
