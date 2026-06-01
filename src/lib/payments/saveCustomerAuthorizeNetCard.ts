import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthorizeNetSessionCluster } from "@/lib/payments/authorizeNetEnvironment";
import { resolveAuthorizeNetSessionCluster } from "@/lib/payments/authorizeNetEnvironment";
import type { AuthorizeNetOpaqueData, MerchantAuthorizeCredentials } from "@/lib/payments/authorizeNetMerchantApi";
import {
  getCustomerPaymentProfileSnapshot,
  vaultMerchantCustomerCard,
} from "@/lib/payments/authorizeNetMerchantApi";
import type { CustomerBillingCard } from "@/lib/payments/saveCustomerReferenceCard";

export type SaveCustomerAuthorizeNetCardResult =
  | { ok: true; card: CustomerBillingCard; billingCards: CustomerBillingCard[]; customerProfileId: string }
  | { ok: false; error: string; status: number };

export async function saveCustomerAuthorizeNetCard(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    customerId: string;
    creds: MerchantAuthorizeCredentials;
    opaqueData: AuthorizeNetOpaqueData;
  }
): Promise<SaveCustomerAuthorizeNetCardResult> {
  const descriptor = params.opaqueData.dataDescriptor?.trim();
  const value = params.opaqueData.dataValue?.trim();
  if (!descriptor || !value) {
    return { ok: false, error: "Missing payment token from Accept.js.", status: 400 };
  }

  const { data: biz, error: bizErr } = await supabase
    .from("businesses")
    .select("authorize_net_environment")
    .eq("id", params.businessId)
    .single();
  if (bizErr || !biz) {
    return { ok: false, error: "Business not found", status: 404 };
  }
  const cluster: AuthorizeNetSessionCluster = resolveAuthorizeNetSessionCluster(
    (biz as { authorize_net_environment?: string | null }).authorize_net_environment
  );

  const { data: cust, error: custErr } = await supabase
    .from("customers")
    .select("id, email, billing_cards, authorize_net_customer_profile_id")
    .eq("id", params.customerId)
    .eq("business_id", params.businessId)
    .single();

  if (custErr || !cust) {
    return { ok: false, error: "Customer not found", status: 404 };
  }

  const row = cust as {
    email?: string | null;
    billing_cards?: unknown;
    authorize_net_customer_profile_id?: string | null;
  };

  let customerProfileId = row.authorize_net_customer_profile_id?.trim() || "";
  let customerPaymentProfileId = "";

  try {
    const vaulted = await vaultMerchantCustomerCard({
      creds: params.creds,
      cluster,
      existingCustomerProfileId: customerProfileId || null,
      merchantCustomerId: params.customerId,
      email: row.email,
      opaqueData: { dataDescriptor: descriptor, dataValue: value },
    });
    customerProfileId = vaulted.customerProfileId;
    customerPaymentProfileId = vaulted.customerPaymentProfileId;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not vault card with Authorize.Net";
    return { ok: false, error: msg, status: 502 };
  }

  let last4: string | null = null;
  let brand: string | null = "Card";
  let expMonth: number | null = null;
  let expYear: number | null = null;

  try {
    const snapshot = await getCustomerPaymentProfileSnapshot(
      params.creds,
      customerProfileId,
      customerPaymentProfileId,
      cluster
    );
    last4 = snapshot.last4;
    brand = snapshot.brand || "Card";
    expMonth = snapshot.expMonth;
    expYear = snapshot.expYear;
  } catch (e) {
    console.warn("[saveCustomerAuthorizeNetCard] getCustomerPaymentProfile failed:", e);
  }

  if (!last4) {
    return {
      ok: false,
      error: "Card was vaulted but profile details could not be loaded. Try again.",
      status: 502,
    };
  }

  const newCard: CustomerBillingCard = {
    brand,
    last4,
    expMonth,
    expYear,
    authorizeNetPaymentProfileId: customerPaymentProfileId,
    createdAt: new Date().toISOString(),
    source: "authorize_net",
  };

  const existing: CustomerBillingCard[] = Array.isArray(row.billing_cards)
    ? (row.billing_cards as CustomerBillingCard[])
    : [];

  const deduped = existing.filter((c) => {
    const sameProfile =
      c?.authorizeNetPaymentProfileId &&
      c.authorizeNetPaymentProfileId === customerPaymentProfileId;
    const sameLast4 = String(c?.last4 || "") === String(last4);
    return !(sameProfile || sameLast4);
  });

  const next = [newCard, ...deduped];

  const { error: updateErr } = await supabase
    .from("customers")
    .update({
      billing_cards: next,
      authorize_net_customer_profile_id: customerProfileId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.customerId)
    .eq("business_id", params.businessId);

  if (updateErr) {
    return { ok: false, error: updateErr.message || "Failed to save card", status: 500 };
  }

  return { ok: true, card: newCard, billingCards: next, customerProfileId };
}
