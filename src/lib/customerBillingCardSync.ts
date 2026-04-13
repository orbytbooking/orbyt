import type { SupabaseClient } from "@supabase/supabase-js";

export type CustomerBillingCardRow = {
  brand: string;
  last4: string;
  expMonth?: number | null;
  expYear?: number | null;
  stripePaymentMethodId?: string | null;
  createdAt?: string;
  source?: string;
};

/**
 * After a successful card checkout, store display-safe card metadata on the customer row
 * (same `billing_cards` jsonb used for Stripe “add card” in admin).
 */
export async function mergeCheckoutCardOntoCustomer(
  supabase: SupabaseClient,
  params: {
    customerId: string;
    businessId: string;
    last4: string | null | undefined;
    brand: string | null | undefined;
    expMonth?: number | null;
    expYear?: number | null;
    stripePaymentMethodId?: string | null;
  }
): Promise<void> {
  const rawLast = String(params.last4 ?? "").replace(/\D/g, "");
  const last4 = rawLast.length >= 4 ? rawLast.slice(-4) : "";
  if (!last4) return;

  const brand = (params.brand || "Card").trim() || "Card";

  const { data: cust, error: fetchErr } = await supabase
    .from("customers")
    .select("billing_cards")
    .eq("id", params.customerId)
    .eq("business_id", params.businessId)
    .maybeSingle();

  if (fetchErr || !cust) return;

  const existing: CustomerBillingCardRow[] = Array.isArray(
    (cust as { billing_cards?: unknown }).billing_cards
  )
    ? ((cust as { billing_cards: CustomerBillingCardRow[] }).billing_cards ?? [])
    : [];

  const deduped = existing.filter((c) => String(c?.last4 || "") !== last4);

  const pm = params.stripePaymentMethodId?.trim();
  const newCard: CustomerBillingCardRow = {
    brand,
    last4,
    ...(params.expMonth != null ? { expMonth: params.expMonth } : {}),
    ...(params.expYear != null ? { expYear: params.expYear } : {}),
    ...(pm ? { stripePaymentMethodId: pm } : {}),
    createdAt: new Date().toISOString(),
    source: "checkout",
  };

  await supabase
    .from("customers")
    .update({
      billing_cards: [newCard, ...deduped],
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.customerId)
    .eq("business_id", params.businessId);
}

export async function syncCustomerSavedCardFromBooking(
  supabase: SupabaseClient,
  bookingId: string
): Promise<void> {
  const { data: row } = await supabase
    .from("bookings")
    .select("customer_id, business_id, card_last4, card_brand")
    .eq("id", bookingId)
    .maybeSingle();

  if (!row?.customer_id || !row.business_id) return;
  if (!row.card_last4 && !row.card_brand) return;

  await mergeCheckoutCardOntoCustomer(supabase, {
    customerId: row.customer_id as string,
    businessId: row.business_id as string,
    last4: row.card_last4 as string | null,
    brand: row.card_brand as string | null,
  });
}
