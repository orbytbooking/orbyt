import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bookingPayableCentsFromBody,
  isGiftCardCoversFullCheckout,
} from "@/lib/giftCardBooking";

export type ResolvedCheckoutAmount =
  | {
      ok: true;
      payableCents: number;
      giftCardCoversFull: boolean;
      paymentProvider?: "stripe" | "authorize_net";
    }
  | { ok: false; message: string };

function parseNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

/** Expected card charge in cents from a stored booking row. */
export function bookingPayableCentsFromRow(booking: {
  total_price?: unknown;
  amount?: unknown;
}): number {
  const total = parseNum(booking.total_price) || parseNum(booking.amount);
  return Math.max(0, Math.round(total * 100));
}

/**
 * Resolve payable cents for create-checkout from booking id or pending Stripe intent.
 * Uses stored totals (already gift-card-adjusted from book-now payload).
 */
export async function resolveExpectedCheckoutCents(
  supabase: SupabaseClient,
  params: {
    businessId?: string | null;
    bookingId?: string | null;
    pendingStripeBookingIntentId?: string | null;
  },
): Promise<ResolvedCheckoutAmount> {
  const businessId = params.businessId?.trim() || null;
  const bookingId = params.bookingId?.trim() || null;
  const intentId = params.pendingStripeBookingIntentId?.trim() || null;

  if (intentId) {
    if (!businessId) {
      return { ok: false, message: "Business context is required for checkout." };
    }
    const { data: intent, error } = await supabase
      .from("pending_stripe_booking_intents")
      .select("amount_cents, payload, business_id")
      .eq("id", intentId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (error || !intent) {
      return { ok: false, message: "Payment session not found. Please restart checkout." };
    }
    const payload =
      intent.payload && typeof intent.payload === "object" && !Array.isArray(intent.payload)
        ? (intent.payload as Record<string, unknown>)
        : {};
    const fromPayload = bookingPayableCentsFromBody(payload);
    const stored = parseNum(intent.amount_cents);
    const payableCents = stored > 0 ? Math.round(stored) : fromPayload;
    return {
      ok: true,
      payableCents,
      giftCardCoversFull: isGiftCardCoversFullCheckout(payload),
    };
  }

  if (bookingId) {
    let q = supabase.from("bookings").select("total_price, amount, business_id").eq("id", bookingId);
    if (businessId) q = q.eq("business_id", businessId);
    const { data: booking, error } = await q.maybeSingle();
    if (error || !booking) {
      return { ok: false, message: "Booking not found for payment." };
    }
    const payableCents = bookingPayableCentsFromRow(booking);
    return {
      ok: true,
      payableCents,
      giftCardCoversFull: payableCents < 50,
    };
  }

  return { ok: false, message: "bookingId or pendingStripeBookingIntentId is required." };
}

/** True when client and server cents differ by more than one cent (rounding). */
export function checkoutAmountMismatch(clientCents: number, expectedCents: number): boolean {
  return Math.abs(Math.round(clientCents) - Math.round(expectedCents)) > 1;
}
