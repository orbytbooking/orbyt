import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/emailService';
import { createCheckout } from '@/lib/payments/createCheckout';
import Stripe from "stripe";
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from '@/lib/auth-helpers';

async function tryUpdateCardDetailsFromStripe(params: {
  supabase: ReturnType<typeof createClient>;
  businessId: string;
  bookingId: string;
  paymentIntentId: string;
}) {
  const { supabase, businessId, bookingId, paymentIntentId } = params;

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
  if (!secretKey) return;

  const stripe = new Stripe(secretKey);
  try {
    const pi =
      stripeSecretKey == null && stripeConnectAccountId
        ? await stripe.paymentIntents.retrieve(paymentIntentId, { stripeAccount: stripeConnectAccountId })
        : await stripe.paymentIntents.retrieve(paymentIntentId);

    const charge = pi.charges?.data?.[0];
    const card = charge?.payment_method_details?.card;
    const last4 = card?.last4 ?? null;
    const brand = card?.brand ?? null;
    if (!last4 && !brand) return;

    await supabase
      .from("bookings")
      .update({
        ...(last4 ? { card_last4: last4 } : {}),
        ...(brand ? { card_brand: brand } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("business_id", businessId);
  } catch (e) {
    console.warn("[booking-charges] could not fetch card details:", paymentIntentId, e);
  }
}

/**
 * POST: Process charge for a completed booking
 * Body: { method: 'cash' | 'online' | 'void' | 'refund' | 'revert_pending' | 'tip' | 'additional_charge', sendEmail?: boolean, tipAmount?: number, additionalAmount?: number, tipCollectionMethod?: 'existing_card' | 'new_card' | 'cash_check', excludeNotification?: boolean, paymentIntentId?: string, note?: string }
 * - cash: Mark payment_status = paid
 * - online: Create checkout URL; sendEmail defaults true (requires customer email). If sendEmail is false,
 *   skips email and only returns checkoutUrl for manual sharing.
 * - void: Mark payment voided
 * - refund: If paid, mark refunded. For Stripe, attempts to create a provider refund using the stored
 *   payment_provider_session_id from checkout creation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const role = user.user_metadata?.role as string | undefined;
    if (role === 'customer') return createForbiddenResponse('Customers cannot access this resource');

    const { id: bookingId } = await params;
    const businessId = request.headers.get('x-business-id');
    if (!businessId || !bookingId) {
      return NextResponse.json({ error: 'Business ID and booking ID required' }, { status: 400 });
    }

    const body = await request.json();
    const method = (body.method ?? 'cash') as 'cash' | 'online' | 'void' | 'refund' | 'revert_pending' | 'tip' | 'additional_charge';
    const sendPaymentEmail = body.sendEmail !== false;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: owned } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (!owned) {
      return createForbiddenResponse('You do not have access to this business');
    }

    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, total_price, customer_email, customer_name, service, scheduled_date, business_id, status, payment_status, payment_method, payment_provider_session_id, refund_id')
      .eq('id', bookingId)
      .eq('business_id', businessId)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const b = booking as { status?: string; payment_status?: string };
    if (b.status !== 'completed') {
      return NextResponse.json(
        { error: 'Only completed bookings can be settled from Booking Charges' },
        { status: 400 }
      );
    }
    if (method === "refund") {
      if (b.payment_status === "refunded") {
        return NextResponse.json({ success: true, message: "Already refunded" });
      }
      if (b.payment_status !== "paid") {
        return NextResponse.json({ error: "Only paid bookings can be refunded" }, { status: 400 });
      }

      const bookingRow = booking as {
        payment_method?: string | null;
        payment_provider_session_id?: string | null;
        refund_id?: string | null;
      };

      // Cash/check refunds are manual outside the system — we just record the status.
      if ((bookingRow.payment_method ?? "").toLowerCase() !== "online") {
        const { error: updateErr } = await supabase
          .from("bookings")
          .update({
            payment_status: "refunded",
            refunded_at: new Date().toISOString(),
            refund_provider: "manual",
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId)
          .eq("business_id", businessId)
          .eq("payment_status", "paid");
        if (updateErr) {
          return NextResponse.json({ error: "Failed to mark refunded" }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: "Marked as refunded" });
      }

      // Online payment: attempt provider refund when possible.
      const { data: biz } = await supabase
        .from("businesses")
        .select("payment_provider, stripe_connect_account_id, stripe_secret_key")
        .eq("id", businessId)
        .single();

      const paymentProvider = (biz as { payment_provider?: string | null } | null)?.payment_provider ?? "stripe";
      if (paymentProvider === "authorize_net") {
        const { error: updateErr } = await supabase
          .from("bookings")
          .update({
            payment_status: "refunded",
            refunded_at: new Date().toISOString(),
            refund_provider: "authorize_net",
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId)
          .eq("business_id", businessId)
          .eq("payment_status", "paid");
        if (updateErr) {
          return NextResponse.json({ error: "Failed to mark refunded" }, { status: 500 });
        }
        return NextResponse.json({
          success: true,
          message: "Marked as refunded. (Authorize.net refunds must be processed in Authorize.net.)",
        });
      }

      const sessionIdRaw = String(bookingRow.payment_provider_session_id ?? "").trim();
      if (!sessionIdRaw) {
        return NextResponse.json(
          {
            error:
              "Missing stored Stripe session id for this booking. Generate the payment link again from Booking Charges to store it, or refund directly in Stripe.",
          },
          { status: 400 }
        );
      }

      const skRaw = (biz as { stripe_secret_key?: string | null } | null)?.stripe_secret_key;
      const stripeSecretKey = skRaw != null && String(skRaw).trim() !== "" ? String(skRaw) : null;
      const stripeConnectAccountId =
        (biz as { stripe_connect_account_id?: string | null } | null)?.stripe_connect_account_id ?? null;

      const secretKey = stripeSecretKey ?? process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
      }

      const stripe = new Stripe(secretKey);
      let paymentIntentId: string | null = null;
      if (sessionIdRaw.startsWith("pi_")) {
        paymentIntentId = sessionIdRaw;
      } else {
        let session: Stripe.Checkout.Session;
        try {
          session =
            stripeSecretKey == null && stripeConnectAccountId
              ? await stripe.checkout.sessions.retrieve(sessionIdRaw, { stripeAccount: stripeConnectAccountId })
              : await stripe.checkout.sessions.retrieve(sessionIdRaw);
        } catch (e) {
          console.error("[booking-charges refund] Stripe session retrieve failed:", sessionIdRaw, e);
          return NextResponse.json({ error: "Failed to retrieve Stripe session" }, { status: 400 });
        }
        paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
      }
      if (!paymentIntentId) {
        return NextResponse.json({ error: "Stripe payment intent not found" }, { status: 400 });
      }

      if (bookingRow.refund_id) {
        // Idempotency guard: already recorded a refund id.
        const { error: updateErr } = await supabase
          .from("bookings")
          .update({
            payment_status: "refunded",
            refunded_at: new Date().toISOString(),
            refund_provider: "stripe",
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId)
          .eq("business_id", businessId);
        if (updateErr) {
          return NextResponse.json({ error: "Failed to mark refunded" }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: "Refund recorded" });
      }

      let refund: Stripe.Refund;
      try {
        refund =
          stripeSecretKey == null && stripeConnectAccountId
            ? await stripe.refunds.create({ payment_intent: paymentIntentId }, { stripeAccount: stripeConnectAccountId })
            : await stripe.refunds.create({ payment_intent: paymentIntentId });
      } catch (e) {
        console.error("[booking-charges refund] Stripe refund failed:", paymentIntentId, e);
        return NextResponse.json(
          { error: "Stripe refund failed. Check Stripe dashboard for more details." },
          { status: 400 }
        );
      }

      const { error: updateErr } = await supabase
        .from("bookings")
        .update({
          payment_status: "refunded",
          refunded_at: new Date().toISOString(),
          refund_provider: "stripe",
          refund_id: refund.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .eq("business_id", businessId)
        .eq("payment_status", "paid");

      if (updateErr) {
        return NextResponse.json(
          { error: "Refund issued in Stripe, but failed to update booking status" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: "Refunded" });
    }

    if (method === "revert_pending") {
      const { error: updateErr } = await supabase
        .from("bookings")
        .update({
          payment_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .eq("business_id", businessId);
      if (updateErr) {
        return NextResponse.json({ error: "Failed to revert payment status" }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: "Reverted to pending" });
    }

    if (method === "tip") {
      const tipAmount = Number(body.tipAmount ?? 0);
      if (!Number.isFinite(tipAmount) || tipAmount <= 0) {
        return NextResponse.json({ error: "tipAmount must be greater than 0" }, { status: 400 });
      }
      const tipCollectionMethod = String(body.tipCollectionMethod ?? "new_card");
      const excludeNotification = body.excludeNotification === true;
      const paymentIntentIdRaw = String(body.paymentIntentId ?? "").trim();
      const hasDirectStripeCharge = paymentIntentIdRaw.startsWith("pi_");
      const roundedTip = Math.round(tipAmount * 100) / 100;
      const currentTotal = Number((booking as { total_price?: number }).total_price ?? 0);
      const nextTotal = Math.round((currentTotal + roundedTip) * 100) / 100;
      const useCash = tipCollectionMethod === "cash_check";
      const custEmail = String((booking as { customer_email?: string | null }).customer_email ?? "").trim();
      const { error: updateErr } = await supabase
        .from("bookings")
        .update({
          tip_amount: roundedTip,
          total_price: nextTotal,
          payment_status: useCash || hasDirectStripeCharge ? "paid" : "pending",
          payment_method: useCash ? "cash" : "online",
          ...(hasDirectStripeCharge ? { payment_provider_session_id: paymentIntentIdRaw } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .eq("business_id", businessId);
      if (updateErr) {
        return NextResponse.json({ error: "Failed to add tip" }, { status: 500 });
      }

      if (hasDirectStripeCharge) {
        await tryUpdateCardDetailsFromStripe({
          supabase,
          businessId,
          bookingId,
          paymentIntentId: paymentIntentIdRaw,
        });
        if (!excludeNotification && custEmail) {
          try {
            const { data: biz } = await supabase
              .from("businesses")
              .select("name, business_email, business_phone")
              .eq("id", businessId)
              .single();
            const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
            const emailService = new EmailService();
            await emailService.sendReceiptEmail({
              to: custEmail,
              customerName: (booking as { customer_name?: string | null }).customer_name ?? "Customer",
              businessName: (biz as { name?: string } | null)?.name ?? "Your Business",
              service: `Tip for ${(booking as { service?: string | null }).service ?? "service"}`,
              amount: roundedTip,
              bookingRef: bkRef,
              paymentMethod: "card",
              supportEmail: (biz as { business_email?: string | null } | null)?.business_email ?? null,
              supportPhone: (biz as { business_phone?: string | null } | null)?.business_phone ?? null,
            });
          } catch (e) {
            console.warn("[booking-charges tip] receipt email failed:", e);
          }
        }

        return NextResponse.json({
          success: true,
          message: `Tip charged successfully via Stripe ($${roundedTip.toFixed(2)}).`,
        });
      }

      if (!useCash) {
        const amountInCents = Math.round(roundedTip * 100);
        if (amountInCents < 50) {
          return NextResponse.json({ error: "Minimum tip charge is $0.50" }, { status: 400 });
        }
        const origin = process.env.NEXT_PUBLIC_APP_URL || "";
        let checkoutUrl = "";
        let providerSessionId: string | null = null;
        try {
          const result = await createCheckout(
            {
              bookingId,
              amountInCents,
              customerEmail: custEmail || undefined,
              businessId,
              successUrl: `${origin}/pay/booking-complete?session_id={CHECKOUT_SESSION_ID}&business=${encodeURIComponent(businessId)}`,
              cancelUrl: `${origin}/pay/booking-complete?cancelled=1&business=${encodeURIComponent(businessId)}`,
              lineItemDescription: `Tip for ${booking.service ?? "service"} - booking ${String(bookingId).slice(0, 8)}...`,
              origin,
            },
            supabase
          );
          checkoutUrl = result.url;
          providerSessionId = result.sessionId;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Tip checkout setup failed";
          const status = msg.includes("not configured") ? 500 : 400;
          return NextResponse.json({ error: msg }, { status });
        }

        if (providerSessionId) {
          const { error: sessErr } = await supabase
            .from("bookings")
            .update({ payment_provider_session_id: providerSessionId, updated_at: new Date().toISOString() })
            .eq("id", bookingId)
            .eq("business_id", businessId);
          if (sessErr) {
            console.warn("[booking-charges tip] failed to store provider session id:", bookingId, sessErr);
          }
        }

        if (!excludeNotification && custEmail) {
          try {
            const { data: biz } = await supabase.from("businesses").select("name").eq("id", businessId).single();
            const businessName = (biz as { name?: string } | null)?.name ?? "Your service provider";
            const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
            const emailService = new EmailService();
            await emailService.sendPaymentLinkEmail({
              to: custEmail,
              customerName: (booking as { customer_name?: string | null }).customer_name ?? "Customer",
              businessName,
              service: `Tip for ${(booking as { service?: string | null }).service ?? "service"}`,
              amount: roundedTip,
              bookingRef: bkRef,
              paymentUrl: checkoutUrl,
            });
          } catch (e) {
            console.warn("[booking-charges tip] payment link email failed:", e);
          }
        }

        return NextResponse.json({
          success: true,
          checkoutUrl,
          message: excludeNotification
            ? `Tip added ($${roundedTip.toFixed(2)}). Stripe payment link ready.`
            : `Tip added ($${roundedTip.toFixed(2)}). Stripe payment link generated${custEmail ? ` and emailed to ${custEmail}` : ""}.`,
          ...(custEmail && !excludeNotification ? { emailedTo: custEmail } : {}),
        });
      }

      return NextResponse.json({
        success: true,
        message: useCash
          ? `Tip added ($${roundedTip.toFixed(2)}). Marked paid by cash/check.`
          : `Tip added ($${roundedTip.toFixed(2)}). Booking moved to pending for card collection.${excludeNotification ? " Notification excluded." : ""}`,
      });
    }

    if (method === "additional_charge") {
      const addAmount = Number(body.additionalAmount ?? 0);
      if (!Number.isFinite(addAmount) || addAmount <= 0) {
        return NextResponse.json({ error: "additionalAmount must be greater than 0" }, { status: 400 });
      }
      const paymentIntentIdRaw = String(body.paymentIntentId ?? "").trim();
      const hasDirectStripeCharge = paymentIntentIdRaw.startsWith("pi_");
      const roundedAdd = Math.round(addAmount * 100) / 100;
      const currentTotal = Number((booking as { total_price?: number }).total_price ?? 0);
      const nextTotal = Math.round((currentTotal + roundedAdd) * 100) / 100;

      const { error: updateErr } = await supabase
        .from("bookings")
        .update({
          total_price: nextTotal,
          payment_status: hasDirectStripeCharge ? "paid" : "pending",
          payment_method: "online",
          ...(hasDirectStripeCharge ? { payment_provider_session_id: paymentIntentIdRaw } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .eq("business_id", businessId);
      if (updateErr) {
        return NextResponse.json({ error: "Failed to add additional charge" }, { status: 500 });
      }

      if (hasDirectStripeCharge) {
        await tryUpdateCardDetailsFromStripe({
          supabase,
          businessId,
          bookingId,
          paymentIntentId: paymentIntentIdRaw,
        });
        const custEmail = String((booking as { customer_email?: string | null }).customer_email ?? "").trim();
        if (custEmail && body.excludeNotification !== true) {
          try {
            const { data: biz } = await supabase
              .from("businesses")
              .select("name, business_email, business_phone")
              .eq("id", businessId)
              .single();
            const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
            const emailService = new EmailService();
            await emailService.sendReceiptEmail({
              to: custEmail,
              customerName: (booking as { customer_name?: string | null }).customer_name ?? "Customer",
              businessName: (biz as { name?: string } | null)?.name ?? "Your Business",
              service: `Additional charge${body.note ? ` - ${String(body.note)}` : ""}`,
              amount: roundedAdd,
              bookingRef: bkRef,
              paymentMethod: "card",
              supportEmail: (biz as { business_email?: string | null } | null)?.business_email ?? null,
              supportPhone: (biz as { business_phone?: string | null } | null)?.business_phone ?? null,
            });
          } catch (e) {
            console.warn("[booking-charges additional_charge] receipt email failed:", e);
          }
        }
        return NextResponse.json({
          success: true,
          message: `Additional charge paid via Stripe ($${roundedAdd.toFixed(2)}).`,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Additional charge added ($${roundedAdd.toFixed(2)}). Booking moved to pending.`,
      });
    }

    if (b.payment_status !== 'pending' && method !== 'void') {
      return NextResponse.json(
        { error: 'This booking is not awaiting payment (pending)' },
        { status: 400 }
      );
    }
    if (method === 'void' && b.payment_status !== 'pending') {
      return NextResponse.json({ error: 'Only pending payments can be voided' }, { status: 400 });
    }

    if (method === 'cash') {
      const { error: updateErr } = await supabase
        .from('bookings')
        .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .eq('business_id', businessId);

      if (updateErr) {
        return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 });
      }

      const custEmail = (booking as { customer_email?: string }).customer_email;
      if (custEmail) {
        try {
          const { data: biz } = await supabase
            .from('businesses')
            .select('name, business_email, business_phone')
            .eq('id', businessId)
            .single();
          const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
          const emailService = new EmailService();
          await emailService.sendReceiptEmail({
            to: custEmail,
            customerName: (booking as { customer_name?: string }).customer_name ?? 'Customer',
            businessName: (biz as { name?: string } | null)?.name ?? 'Your Business',
            service: (booking as { service?: string }).service ?? null,
            amount: Number((booking as { total_price?: number }).total_price ?? 0),
            bookingRef: bkRef,
            paymentMethod: 'cash',
            supportEmail: (biz as { business_email?: string | null } | null)?.business_email ?? null,
            supportPhone: (biz as { business_phone?: string | null } | null)?.business_phone ?? null,
          });
        } catch (e) {
          console.warn('Receipt email (cash) failed:', e);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Marked as paid (cash/check)',
      });
    }

    if (method === 'void') {
      const { error: updateErr } = await supabase
        .from('bookings')
        .update({ payment_status: 'voided', updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .eq('business_id', businessId);

      if (updateErr) {
        return NextResponse.json({ error: 'Failed to void payment' }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        message: 'Payment voided ($0)',
      });
    }

    // online: create checkout session (Stripe or Authorize.net per business payment_provider)
    const amount = Number(booking.total_price) || 0;
    const amountInCents = Math.round(amount * 100);
    if (amountInCents < 50) {
      return NextResponse.json({ error: 'Minimum charge is $0.50' }, { status: 400 });
    }

    const custEmail = String((booking as { customer_email?: string | null }).customer_email ?? '').trim();
    if (sendPaymentEmail && !custEmail) {
      return NextResponse.json(
        {
          error:
            'Customer email is required to send the payment link. Add an email on the booking, or use Show payment link to copy the URL manually.',
        },
        { status: 400 }
      );
    }

    // So Stripe / Authorize.net return handlers can mark the job paid (Authorize.net confirm-return
    // previously required payment_method === 'online', while many bookings default to 'cash').
    const { error: pmErr } = await supabase
      .from('bookings')
      .update({ payment_method: 'online', updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .eq('business_id', businessId)
      .eq('payment_status', 'pending');
    if (pmErr) {
      return NextResponse.json({ error: 'Failed to prepare booking for online payment' }, { status: 500 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || '';
    let checkoutUrl: string;
    let providerSessionId: string | null = null;
    try {
      const result = await createCheckout(
        {
          bookingId,
          amountInCents,
          customerEmail: booking.customer_email ?? undefined,
          businessId,
          successUrl: `${origin}/pay/booking-complete?session_id={CHECKOUT_SESSION_ID}&business=${encodeURIComponent(businessId)}`,
          cancelUrl: `${origin}/pay/booking-complete?cancelled=1&business=${encodeURIComponent(businessId)}`,
          lineItemDescription: `${booking.service ?? 'Service'} - ${booking.scheduled_date ?? ''}`,
          origin,
        },
        supabase
      );
      checkoutUrl = result.url;
      providerSessionId = result.sessionId;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Checkout setup failed';
      const status = msg.includes('not configured') ? 500 : 400;
      return NextResponse.json({ error: msg }, { status });
    }

    if (providerSessionId) {
      const { error: sessErr } = await supabase
        .from("bookings")
        .update({ payment_provider_session_id: providerSessionId, updated_at: new Date().toISOString() })
        .eq("id", bookingId)
        .eq("business_id", businessId)
        .eq("payment_status", "pending");
      if (sessErr) {
        console.warn("[booking-charges] failed to store provider session id:", bookingId, sessErr);
      }
    }

    // If this is Stripe checkout, prefetch last4 after session completes happens elsewhere,
    // but we might be generating multiple links; keep card details blank until paid.

    if (sendPaymentEmail) {
      const { data: biz } = await supabase.from('businesses').select('name').eq('id', businessId).single();
      const businessName = (biz as { name?: string } | null)?.name ?? 'Your service provider';
      const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
      const emailService = new EmailService();
      const sent = await emailService.sendPaymentLinkEmail({
        to: custEmail,
        customerName: (booking as { customer_name?: string | null }).customer_name ?? 'Customer',
        businessName,
        service: (booking as { service?: string | null }).service ?? null,
        amount,
        bookingRef: bkRef,
        paymentUrl: checkoutUrl,
      });
      if (!sent) {
        return NextResponse.json(
          {
            error:
              'Could not send the payment email. Check RESEND_API_KEY, RESEND_FROM_EMAIL, and your Resend domain.',
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      checkoutUrl,
      message: sendPaymentEmail
        ? `Payment link sent to ${custEmail}`
        : 'Payment link ready — copy it to share with your customer.',
      ...(sendPaymentEmail && custEmail ? { emailedTo: custEmail } : {}),
    });
  } catch (e) {
    console.error('Booking charge POST:', e);
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
