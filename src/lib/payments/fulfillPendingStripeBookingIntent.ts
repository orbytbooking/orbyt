import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  materializeCustomerBookingFromIntentPayload,
  materializeGuestBookingFromIntentPayload,
} from "@/lib/payments/materializePendingStripeIntentBookings";

type IntentRow = {
  id: string;
  business_id: string;
  source: string;
  customer_auth_user_id: string | null;
  payload: Record<string, unknown>;
  amount_cents: number;
  consumed_at: string | null;
  created_booking_id: string | null;
};

/**
 * Resolve pending intent from Checkout session (session id stored on row after session create).
 */
export async function loadPendingIntentForStripeSession(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<IntentRow | null> {
  const sessionId = session.id;
  const metaPending = session.metadata?.pending_stripe_booking_id?.trim();

  if (sessionId) {
    const { data: bySession } = await supabase
      .from("pending_stripe_booking_intents")
      .select("*")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();
    if (bySession) return bySession as IntentRow;
  }

  if (metaPending) {
    const { data: byId } = await supabase
      .from("pending_stripe_booking_intents")
      .select("*")
      .eq("id", metaPending)
      .maybeSingle();
    if (byId) return byId as IntentRow;
  }

  return null;
}

export type FulfillPendingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: string };

/**
 * Create booking row(s) from a pending Stripe intent after payment succeeds.
 * Idempotent: concurrent webhooks / retries use consumed_at + created_booking_id.
 */
export async function fulfillPendingStripeBookingIntent(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  businessIdFromMetadata: string
): Promise<FulfillPendingResult> {
  if (session.mode !== "payment") {
    return { ok: false, error: "not_payment_mode" };
  }
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return { ok: false, error: "payment_not_complete" };
  }

  const intent = await loadPendingIntentForStripeSession(supabase, session);
  if (!intent) {
    return { ok: false, error: "intent_not_found" };
  }

  if (intent.business_id !== businessIdFromMetadata) {
    return { ok: false, error: "business_mismatch" };
  }

  const sessionTotal = session.amount_total;
  if (sessionTotal != null && sessionTotal !== intent.amount_cents) {
    console.warn("[fulfillPendingStripeBookingIntent] amount mismatch", {
      session: sessionTotal,
      intent: intent.amount_cents,
      sessionId: session.id,
    });
    return { ok: false, error: "amount_mismatch" };
  }

  if (intent.created_booking_id) {
    return { ok: true, bookingId: intent.created_booking_id };
  }

  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("pending_stripe_booking_intents")
    .update({ consumed_at: now })
    .eq("id", intent.id)
    .is("consumed_at", null)
    .select("id, created_booking_id")
    .maybeSingle();

  if (claimError) {
    console.error("[fulfillPendingStripeBookingIntent] claim error", claimError);
    return { ok: false, error: "claim_failed" };
  }

  if (!claimed) {
    for (let i = 0; i < 5; i++) {
      const { data: again } = await supabase
        .from("pending_stripe_booking_intents")
        .select("created_booking_id")
        .eq("id", intent.id)
        .maybeSingle();
      if (again?.created_booking_id) {
        return { ok: true, bookingId: again.created_booking_id as string };
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    return { ok: false, error: "claim_lost" };
  }

  const payload = intent.payload && typeof intent.payload === "object" ? intent.payload : {};
  let materialized: Awaited<ReturnType<typeof materializeGuestBookingFromIntentPayload>>;

  if (intent.source === "customer") {
    const uid = intent.customer_auth_user_id;
    if (!uid) {
      await supabase.from("pending_stripe_booking_intents").update({ consumed_at: null }).eq("id", intent.id);
      return { ok: false, error: "missing_customer_auth" };
    }
    materialized = await materializeCustomerBookingFromIntentPayload(supabase, intent.business_id, uid, payload);
  } else {
    materialized = await materializeGuestBookingFromIntentPayload(supabase, intent.business_id, payload);
  }

  if (!materialized.ok) {
    await supabase.from("pending_stripe_booking_intents").update({ consumed_at: null }).eq("id", intent.id);
    return { ok: false, error: materialized.error };
  }

  const bookingId = materialized.primaryBookingId;

  let linkError: { message?: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const link = await supabase
      .from("pending_stripe_booking_intents")
      .update({ created_booking_id: bookingId })
      .eq("id", intent.id);
    linkError = link.error;
    if (!link.error) break;
    await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
  }
  if (linkError) {
    console.error("[fulfillPendingStripeBookingIntent] link booking to intent failed", linkError);
  }

  return { ok: true, bookingId };
}
