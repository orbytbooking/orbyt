import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { EmailService } from "@/lib/emailService";
import {
  PLATFORM_SUBSCRIPTION_KIND,
  PLATFORM_PENDING_OWNER_KIND,
  mapStripeStatusToDb,
} from "@/lib/platform-billing/stripePlatformSubscription";
import {
  isPlatformSubscriptionMetadata,
  recordPlatformInvoicePaid,
  syncPlatformSubscriptionRow,
} from "@/lib/platform-billing/applyPlatformSubscriptionFromStripe";
import { processPendingOwnerCheckout } from "@/lib/webhooks/processPendingOwnerCheckout";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Stripe webhook handler. Uses raw body (request.text()) for signature verification.
 * Do not use request.json() here — the body must remain raw for constructEvent().
 */
export async function POST(request: Request) {
  const stripeSignature = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  if (!stripeSignature) {
    console.error("[Stripe Webhook] Missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (e) {
    console.error("[Stripe Webhook] Failed to read raw body", e);
    return NextResponse.json(
      { error: "Invalid body" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, stripeSignature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe Webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  console.log("[Stripe Webhook] Event received:", event.id, event.type);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase =
    supabaseUrl && supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey)
      : null;

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Deferred owner signup: try for every subscription checkout. Stripe webhook payloads
      // sometimes omit metadata.kind; processPendingOwnerCheckout also reads client_reference_id.
      // Non-pending sessions return benign errors (missing_pending_id / not_pending_owner_checkout).
      if (session.mode === "subscription" && supabase) {
        const pendingResult = await processPendingOwnerCheckout({
          supabase,
          stripe,
          session,
        });
        if (pendingResult.ok) {
          console.log("[Stripe Webhook] Pending owner checkout processed:", session.id);
        } else {
          const benign = new Set([
            "not_pending_owner_checkout",
            "missing_pending_id",
            "not_subscription_checkout",
          ]);
          if (!benign.has(pendingResult.error)) {
            console.error("[Stripe Webhook] Pending owner checkout failed:", pendingResult.error);
            return NextResponse.json({ error: "pending_owner_failed" }, { status: 500 });
          }
        }
      }

      if (
        session.mode === "subscription" &&
        session.metadata?.kind === PLATFORM_SUBSCRIPTION_KIND &&
        supabase
      ) {
        const businessId = session.metadata.business_id;
        const planSlug = (session.metadata.plan_slug ?? "growth").toLowerCase();
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;

        if (businessId && subId && customerId) {
          const subscription = await stripe.subscriptions.retrieve(subId);
          const err = await syncPlatformSubscriptionRow({
            supabase,
            businessId,
            planSlug,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subId,
            subscription,
          });
          if (err.error) {
            console.error("[Stripe Webhook] Platform subscription sync failed:", err.error);
            return NextResponse.json(
              { error: "Failed to sync platform subscription" },
              { status: 500 }
            );
          }
          console.log("[Stripe Webhook] Platform subscription synced:", businessId, planSlug);
        } else {
          console.warn(
            "[Stripe Webhook] platform_subscription checkout missing ids:",
            session.id
          );
        }
      } else if (session.metadata?.booking_id) {
        // Booking payment (existing behavior)
        await handleBookingCheckoutCompleted(session, supabase);
      } else if (session.mode === "subscription") {
        console.warn(
          "[Stripe Webhook] checkout.session.completed subscription without platform or booking metadata:",
          session.id
        );
      } else {
        console.warn(
          "[Stripe Webhook] checkout.session.completed with no booking_id or platform metadata:",
          session.id
        );
      }
    }

    if (event.type === "invoice.paid" && supabase) {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subId);
        if (isPlatformSubscriptionMetadata(subscription.metadata)) {
          const businessId = subscription.metadata.business_id;
          const planSlug = (subscription.metadata.plan_slug ?? "growth").toLowerCase();
          if (businessId) {
            const result = await recordPlatformInvoicePaid({
              supabase,
              businessId,
              planSlug,
              invoice,
            });
            if (result.error) {
              console.error("[Stripe Webhook] platform_payments record failed:", result.error);
              return NextResponse.json(
                { error: "Failed to record platform payment" },
                { status: 500 }
              );
            }
            console.log("[Stripe Webhook] Platform invoice recorded:", invoice.id);
          }
        }
      }
    }

    if (event.type === "customer.subscription.updated" && supabase) {
      const sub = event.data.object as Stripe.Subscription;
      if (isPlatformSubscriptionMetadata(sub.metadata)) {
        const businessId = sub.metadata.business_id;
        const planSlug = (sub.metadata.plan_slug ?? "growth").toLowerCase();
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        if (businessId && customerId) {
          await syncPlatformSubscriptionRow({
            supabase,
            businessId,
            planSlug,
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            subscription: sub,
          });
          console.log("[Stripe Webhook] Platform subscription updated from Stripe:", sub.id);
        }
      }
    }

    if (event.type === "customer.subscription.deleted" && supabase) {
      const sub = event.data.object as Stripe.Subscription;
      if (isPlatformSubscriptionMetadata(sub.metadata)) {
        const businessId = sub.metadata.business_id;
        if (businessId) {
          const { data: starter } = await supabase
            .from("platform_subscription_plans")
            .select("id")
            .eq("slug", "starter")
            .maybeSingle();
          const starterId = starter ? (starter as { id: string }).id : null;

          await supabase
            .from("platform_subscriptions")
            .update({
              status: mapStripeStatusToDb("canceled"),
              plan_id: starterId,
              stripe_subscription_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq("business_id", businessId);

          await supabase
            .from("businesses")
            .update({ plan: "starter", is_active: false, updated_at: new Date().toISOString() })
            .eq("id", businessId);

          console.log("[Stripe Webhook] Platform subscription canceled; downgraded to starter:", businessId);
        }
      }
    }
  } catch (handlerErr) {
    console.error("[Stripe Webhook] Handler error:", handlerErr);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleBookingCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createClient> | null
) {
  console.log("[Stripe Webhook] checkout.session.completed", {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    metadata: session.metadata,
  });

  const bookingId = session.metadata?.booking_id;
  const businessId = session.metadata?.business_id;
  if (!bookingId || !supabase) {
    console.warn("[Stripe Webhook] checkout.session.completed with no booking_id or supabase:", session.id);
    return;
  }

  const { error } = await supabase
    .from("bookings")
    .update({ payment_status: "paid" })
    .eq("id", bookingId);
  if (error) {
    console.error("[Stripe Webhook] Failed to update booking payment_status:", bookingId, error);
    throw new Error("Failed to update booking");
  }
  console.log("[Stripe Webhook] Booking marked as paid:", bookingId);

  const custEmail = session.customer_email ?? session.customer_details?.email;
  if (custEmail) {
    try {
      const { data: booking } = await supabase
        .from("bookings")
        .select("customer_name, service, total_price")
        .eq("id", bookingId)
        .single();
      const { data: biz } = businessId
        ? await supabase.from("businesses").select("name").eq("id", businessId).single()
        : { data: null };
      const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
      const emailService = new EmailService();
      await emailService.sendReceiptEmail({
        to: custEmail,
        customerName: booking?.customer_name ?? "Customer",
        businessName: (biz as { name?: string } | null)?.name ?? "Your Business",
        service: booking?.service ?? null,
        amount: Number(booking?.total_price ?? 0),
        bookingRef: bkRef,
        paymentMethod: "card",
      });
    } catch (e) {
      console.warn("[Stripe Webhook] Receipt email failed:", e);
    }
  }
}
