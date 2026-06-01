import type { SupabaseClient } from "@supabase/supabase-js";
import {
  detectCardBrandFromNumber,
  extractLast4,
  parseExpMonthYear,
} from "@/lib/payments/cardReference";

export type CustomerBillingCard = {
  brand: string;
  last4: string;
  expMonth?: number | null;
  expYear?: number | null;
  stripePaymentMethodId?: string | null;
  authorizeNetPaymentProfileId?: string | null;
  createdAt?: string;
  source?: string;
};

export type SaveCustomerReferenceCardInput = {
  cardNumber: string;
  expMonth: number | string;
  expYear: number | string;
  brand?: string | null;
};

export type SaveCustomerReferenceCardResult =
  | { ok: true; card: CustomerBillingCard; billingCards: CustomerBillingCard[] }
  | { ok: false; error: string; status: number };

export function buildReferenceCardPayload(input: SaveCustomerReferenceCardInput): SaveCustomerReferenceCardResult {
  const last4 = extractLast4(input.cardNumber);
  if (!last4) {
    return { ok: false, error: "Enter a valid card number.", status: 400 };
  }

  const parsedExp = parseExpMonthYear(input.expMonth, input.expYear);
  if (parsedExp.error || parsedExp.expMonth == null || parsedExp.expYear == null) {
    return { ok: false, error: parsedExp.error || "Enter a valid expiration date.", status: 400 };
  }

  const brand = (input.brand || detectCardBrandFromNumber(input.cardNumber)).trim() || "Card";
  const card: CustomerBillingCard = {
    brand,
    last4,
    expMonth: parsedExp.expMonth,
    expYear: parsedExp.expYear,
    createdAt: new Date().toISOString(),
    source: "manual",
  };

  return { ok: true, card, billingCards: [card] };
}

export async function saveCustomerReferenceCard(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    customerId: string;
    input: SaveCustomerReferenceCardInput;
  }
): Promise<SaveCustomerReferenceCardResult> {
  const built = buildReferenceCardPayload(params.input);
  if (!built.ok) return built;

  const newCard = built.card;

  const { data: cust, error: custErr } = await supabase
    .from("customers")
    .select("billing_cards")
    .eq("id", params.customerId)
    .eq("business_id", params.businessId)
    .single();

  if (custErr || !cust) {
    return { ok: false, error: "Customer not found", status: 404 };
  }

  const existing: CustomerBillingCard[] = Array.isArray((cust as { billing_cards?: unknown }).billing_cards)
    ? ((cust as { billing_cards: CustomerBillingCard[] }).billing_cards ?? [])
    : [];

  const deduped = existing.filter((c) => {
    const sameLast4 = String(c?.last4 || "") === String(newCard.last4);
    const sameExp =
      String(c?.expMonth ?? "") === String(newCard.expMonth ?? "") &&
      String(c?.expYear ?? "") === String(newCard.expYear ?? "");
    return !(sameLast4 && sameExp);
  });

  const next = [newCard, ...deduped];

  const { error: updateErr } = await supabase
    .from("customers")
    .update({
      billing_cards: next,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.customerId)
    .eq("business_id", params.businessId);

  if (updateErr) {
    return { ok: false, error: updateErr.message || "Failed to save card", status: 500 };
  }

  return { ok: true, card: newCard, billingCards: next };
}
