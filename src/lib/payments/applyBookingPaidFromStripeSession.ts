import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EmailService } from "@/lib/emailService";
import StripeSdk from "stripe";
import { fulfillPendingStripeBookingIntent } from "@/lib/payments/fulfillPendingStripeBookingIntent";

/**
 * Mark a booking paid from a completed Stripe Checkout session.
 * Supports metadata.booking_id (legacy) or deferred book-now flow (no booking until payment; intent row + session id).
 */
export async function applyBookingPaidFromStripeSession(
  session: Stripe.Checkout.Session,
  supabase: SupabaseClient,
  options?: { sendReceipt?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const businessId = session.metadata?.business_id?.trim();
  if (!businessId) {
    return { ok: false, error: "missing_business_id" };
  }
  if (session.mode !== "payment") {
    return { ok: false, error: "not_payment_mode" };
  }
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return { ok: false, error: "payment_not_complete" };
  }

  let bookingId = session.metadata?.booking_id?.trim() || "";
  if (!bookingId) {
    const fulfilled = await fulfillPendingStripeBookingIntent(supabase, session, businessId);
    if (!fulfilled.ok) {
      if (fulfilled.error === "intent_not_found") {
        return { ok: false, error: "missing_booking_id" };
      }
      return fulfilled;
    }
    bookingId = fulfilled.bookingId;
  }

  const { data: existing } = await supabase
    .from("bookings")
    .select("payment_status")
    .eq("id", bookingId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "booking_not_found" };
  }
  if (existing.payment_status === "paid") {
    return { ok: true };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ payment_status: "paid", updated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("business_id", businessId);

  if (error) {
    console.error("[applyBookingPaidFromStripeSession] update failed:", bookingId, error);
    return { ok: false, error: "update_failed" };
  }

  // Persist card details (brand/last4) for display.
  try {
    const piId =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (piId) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("stripe_connect_account_id, stripe_secret_key")
        .eq("id", businessId)
        .single();
      const skRaw = (biz as { stripe_secret_key?: string | null } | null)?.stripe_secret_key;
      const stripeSecretKey = skRaw != null && String(skRaw).trim() !== "" ? String(skRaw) : null;
      const stripeConnectAccountId =
        (biz as { stripe_connect_account_id?: string | null } | null)?.stripe_connect_account_id ?? null;
      const secretKey = stripeSecretKey ?? process.env.STRIPE_SECRET_KEY;
      if (secretKey) {
        const stripe = new StripeSdk(secretKey);
        const pi =
          stripeSecretKey == null && stripeConnectAccountId
            ? await stripe.paymentIntents.retrieve(piId, { stripeAccount: stripeConnectAccountId })
            : await stripe.paymentIntents.retrieve(piId);
        const charge = pi.charges?.data?.[0];
        const card = charge?.payment_method_details?.card;
        if (card?.last4 || card?.brand) {
          await supabase
            .from("bookings")
            .update({
              ...(card?.last4 ? { card_last4: card.last4 } : {}),
              ...(card?.brand ? { card_brand: card.brand } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq("id", bookingId)
            .eq("business_id", businessId);
        }
      }
    }
  } catch (e) {
    console.warn("[applyBookingPaidFromStripeSession] could not persist card details:", e);
  }

  const sendReceipt = options?.sendReceipt !== false;
  if (sendReceipt) {
    const custEmail = session.customer_email ?? session.customer_details?.email;
    if (custEmail) {
      try {
        const { data: booking } = await supabase
          .from("bookings")
          .select("customer_name, service, total_price")
          .eq("id", bookingId)
          .single();
        const { data: biz } = await supabase.from("businesses").select("name").eq("id", businessId).single();
        const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
        const emailService = new EmailService();
        await emailService.sendReceiptEmail({
          to: custEmail,
          customerName: (booking as { customer_name?: string } | null)?.customer_name ?? "Customer",
          businessName: (biz as { name?: string } | null)?.name ?? "Your Business",
          service: (booking as { service?: string | null } | null)?.service ?? null,
          amount: Number((booking as { total_price?: number } | null)?.total_price ?? 0),
          bookingRef: bkRef,
          paymentMethod: "card",
        });
      } catch (e) {
        console.warn("[applyBookingPaidFromStripeSession] Receipt email failed:", e);
      }
    }
  }

  return { ok: true };
}
