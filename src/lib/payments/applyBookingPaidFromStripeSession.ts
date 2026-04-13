import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EmailService } from "@/lib/emailService";
import StripeSdk from "stripe";
import { fulfillPendingStripeBookingIntent } from "@/lib/payments/fulfillPendingStripeBookingIntent";
import { mergeCheckoutCardOntoCustomer } from "@/lib/customerBillingCardSync";

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

  // Intent materialize may already set payment_status paid; still run receipt + card details below.
  if (existing.payment_status !== "paid") {
    const { error } = await supabase
      .from("bookings")
      .update({ payment_status: "paid", updated_at: new Date().toISOString() })
      .eq("id", bookingId)
      .eq("business_id", businessId);

    if (error) {
      console.error("[applyBookingPaidFromStripeSession] update failed:", bookingId, error);
      return { ok: false, error: "update_failed" };
    }
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

          const { data: bk } = await supabase
            .from("bookings")
            .select("customer_id")
            .eq("id", bookingId)
            .eq("business_id", businessId)
            .maybeSingle();
          const custId = (bk as { customer_id?: string | null } | null)?.customer_id;
          if (custId && (card?.last4 || card?.brand)) {
            await mergeCheckoutCardOntoCustomer(supabase, {
              customerId: custId,
              businessId,
              last4: card.last4 ?? null,
              brand: card.brand ?? null,
              expMonth: card.exp_month ?? null,
              expYear: card.exp_year ?? null,
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn("[applyBookingPaidFromStripeSession] could not persist card details:", e);
  }

  const sendReceipt = options?.sendReceipt !== false;
  if (sendReceipt) {
    try {
      const { data: booking } = await supabase
        .from("bookings")
        .select("customer_name, customer_email, service, total_price, amount")
        .eq("id", bookingId)
        .single();
      const sessionEmail =
        (session.customer_email ?? session.customer_details?.email ?? "").toString().trim() || null;
      const bookingEmail = String((booking as { customer_email?: string | null } | null)?.customer_email ?? "").trim() || null;
      const custEmail = sessionEmail || bookingEmail;
      if (custEmail) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("name, business_email, business_phone")
          .eq("id", businessId)
          .single();
        const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
        const bookingTotal = Number((booking as { total_price?: number; amount?: number } | null)?.total_price ?? 0);
        const bookingAmount = Number((booking as { amount?: number } | null)?.amount ?? 0);
        const fromSession =
          session.amount_total != null && session.amount_total > 0 ? session.amount_total / 100 : null;
        const receiptAmount =
          fromSession != null ? fromSession : (bookingTotal > 0 ? bookingTotal : bookingAmount);
        const emailService = new EmailService();
        await emailService.sendReceiptEmail({
          to: custEmail,
          customerName: (booking as { customer_name?: string } | null)?.customer_name ?? "Customer",
          businessName: (biz as { name?: string } | null)?.name ?? "Your Business",
          service: (booking as { service?: string | null } | null)?.service ?? null,
          amount: receiptAmount,
          bookingRef: bkRef,
          paymentMethod: "card",
          supportEmail: (biz as { business_email?: string | null } | null)?.business_email ?? null,
          supportPhone: (biz as { business_phone?: string | null } | null)?.business_phone ?? null,
        });
      }
    } catch (e) {
      console.warn("[applyBookingPaidFromStripeSession] Receipt email failed:", e);
    }
  }

  return { ok: true };
}
