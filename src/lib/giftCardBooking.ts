import type { SupabaseClient } from "@supabase/supabase-js";

export type GiftCardValidation = {
  valid: boolean;
  instance_id: string | null;
  current_balance: number | null;
  expires_at: string | null;
  status: string | null;
  error_message: string | null;
};

export async function validateGiftCardForBusiness(
  supabase: SupabaseClient,
  businessId: string,
  code: string,
): Promise<GiftCardValidation | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const { data, error } = await supabase.rpc("validate_gift_card", {
    card_code: normalized,
    business_uuid: businessId,
  });

  if (error) {
    console.error("validate_gift_card RPC:", error);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    valid: Boolean(row.valid),
    instance_id: row.instance_id ?? null,
    current_balance: row.current_balance != null ? Number(row.current_balance) : null,
    expires_at: row.expires_at ?? null,
    status: row.status ?? null,
    error_message: row.error_message ?? null,
  };
}

export function parseGiftCardRedemptionFromBody(body: Record<string, unknown>): {
  code: string;
  amount: number;
  instanceId: string | null;
} {
  const code = String(body.gift_card_code ?? body.giftCardCode ?? "").trim().toUpperCase();
  const amountRaw = body.gift_card_redemption_amount ?? body.giftCardRedemptionAmount;
  const amount =
    typeof amountRaw === "number" && !Number.isNaN(amountRaw)
      ? amountRaw
      : Number(amountRaw) || 0;
  const instanceId = String(body.gift_card_instance_id ?? body.giftCardInstanceId ?? "").trim() || null;
  return { code, amount: Math.max(0, amount), instanceId };
}

export async function assertGiftCardRedemptionAllowed(
  supabase: SupabaseClient,
  businessId: string,
  code: string,
  amount: number,
): Promise<{ ok: true; validation: GiftCardValidation } | { ok: false; message: string }> {
  if (!code || amount <= 0) {
    return { ok: false, message: "Gift card code and amount are required." };
  }

  const validation = await validateGiftCardForBusiness(supabase, businessId, code);
  if (!validation) {
    return { ok: false, message: "Could not validate gift card." };
  }
  if (!validation.valid) {
    return { ok: false, message: validation.error_message || "Gift card is not valid." };
  }
  const balance = Number(validation.current_balance ?? 0);
  if (amount > balance + 0.001) {
    return { ok: false, message: "Gift card balance is insufficient for this redemption." };
  }

  return { ok: true, validation };
}

export async function redeemGiftCardForBooking(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    code: string;
    amount: number;
    bookingId: string;
    customerId?: string | null;
    description?: string;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertGiftCardRedemptionAllowed(
    supabase,
    params.businessId,
    params.code,
    params.amount,
  );
  if (!gate.ok) return gate;

  const { data, error } = await supabase.rpc("redeem_gift_card", {
    card_code: params.code.trim().toUpperCase(),
    business_uuid: params.businessId,
    redemption_amount: params.amount,
    booking_uuid: params.bookingId,
    customer_uuid: params.customerId ?? null,
    transaction_description: params.description ?? "Booking redemption",
  });

  if (error) {
    console.error("redeem_gift_card RPC:", error);
    return { ok: false, message: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.success) {
    return { ok: false, message: row?.error_message || "Gift card redemption failed." };
  }

  return { ok: true };
}

/** Validate before booking insert; redeem after booking id is known. */
export async function processGiftCardFromBookingBody(
  supabase: SupabaseClient,
  businessId: string,
  body: Record<string, unknown>,
  bookingId: string,
  customerId: string | null,
  phase: "validate" | "redeem",
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { code, amount } = parseGiftCardRedemptionFromBody(body);
  if (!code || amount <= 0) return { ok: true };

  if (phase === "validate") {
    const gate = await assertGiftCardRedemptionAllowed(supabase, businessId, code, amount);
    if (!gate.ok) return gate;
    return { ok: true };
  }

  const redeemed = await redeemGiftCardForBooking(supabase, {
    businessId,
    code,
    amount,
    bookingId,
    customerId,
    description: "Customer booking",
  });
  if (!redeemed.ok) {
    console.error("Gift card redeem after booking failed:", { bookingId, code, amount, message: redeemed.message });
  }
  return redeemed;
}
