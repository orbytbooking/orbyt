import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from "@/lib/auth-helpers";
import { assertUserHasAdminModuleAccess } from "@/lib/bookingApiAuth";

/**
 * Admin: charge a booking total using a saved Stripe payment method on file for the customer.
 * Customer must have stripe_customer_id; PM must appear in customers.billing_cards or belong to that Stripe customer.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    if (user.user_metadata?.role === "customer") {
      return createForbiddenResponse("Customers cannot access this resource");
    }

    const businessId = request.headers.get("x-business-id")?.trim();
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    const stripePaymentMethodId =
      typeof body.stripePaymentMethodId === "string" ? body.stripePaymentMethodId.trim() : "";
    if (!bookingId || !stripePaymentMethodId) {
      return NextResponse.json(
        { error: "bookingId and stripePaymentMethodId are required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const access = await assertUserHasAdminModuleAccess(user.id, businessId, "bookings");
    if (access === "no_service_role") {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    if (access === "denied") {
      return createForbiddenResponse("You do not have access to this business");
    }

    const { data: booking, error: bkErr } = await supabase
      .from("bookings")
      .select("id, business_id, customer_id, total_price, payment_status, customer_email, customer_name, service")
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (bkErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const b = booking as {
      customer_id?: string | null;
      total_price?: number | null;
      payment_status?: string | null;
    };

    if (b.payment_status === "paid") {
      return NextResponse.json({ ok: true, already: true, message: "Booking already paid" });
    }

    if (!b.customer_id) {
      return NextResponse.json(
        { error: "Booking has no customer; saved card charges require a linked customer." },
        { status: 400 }
      );
    }

    const amount = Number(b.total_price ?? 0);
    const amountCents = Math.round(amount * 100);
    if (amountCents < 50) {
      return NextResponse.json({ error: "Amount must be at least $0.50" }, { status: 400 });
    }

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("payment_provider, stripe_connect_account_id, stripe_secret_key")
      .eq("id", businessId)
      .single();

    if (bizErr || !biz) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const row = biz as {
      payment_provider?: string | null;
      stripe_connect_account_id?: string | null;
      stripe_secret_key?: string | null;
    };

    if (row.payment_provider === "authorize_net") {
      return NextResponse.json(
        {
          error:
            "Saved card charge is only available for Stripe. Use a payment link or Authorize.Net hosted checkout for this business.",
        },
        { status: 400 }
      );
    }

    const skRaw = row.stripe_secret_key != null ? String(row.stripe_secret_key).trim() : "";
    const stripeSecretKey = skRaw !== "" ? row.stripe_secret_key : null;
    const stripeConnectAccountId = row.stripe_connect_account_id ?? null;
    const secretKey = stripeSecretKey ?? process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
    }

    const { data: cust, error: custErr } = await supabase
      .from("customers")
      .select("id, billing_cards, stripe_customer_id")
      .eq("id", b.customer_id)
      .eq("business_id", businessId)
      .maybeSingle();

    if (custErr || !cust) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const stripeCustomerId = String(
      (cust as { stripe_customer_id?: string | null }).stripe_customer_id ?? ""
    ).trim();
    if (!stripeCustomerId) {
      return NextResponse.json(
        {
          error:
            "Customer has no Stripe customer id. They need to pay once via Stripe checkout or add a card from the admin customer profile.",
        },
        { status: 400 }
      );
    }

    const cards = (cust as { billing_cards?: unknown }).billing_cards;
    const listedOnProfile = Array.isArray(cards)
      ? cards.some(
          (c: { stripePaymentMethodId?: string }) =>
            String(c?.stripePaymentMethodId ?? "").trim() === stripePaymentMethodId
        )
      : false;

    const stripe = new Stripe(secretKey);
    const stripeOpts =
      stripeSecretKey == null && stripeConnectAccountId
        ? { stripeAccount: stripeConnectAccountId }
        : undefined;

    let pmCustomer: string | null = null;
    try {
      const pm = stripeOpts
        ? await stripe.paymentMethods.retrieve(stripePaymentMethodId, stripeOpts)
        : await stripe.paymentMethods.retrieve(stripePaymentMethodId);
      pmCustomer = typeof pm.customer === "string" ? pm.customer : pm.customer?.id ?? null;
    } catch (e) {
      console.warn("[stripe-charge-saved-card] retrieve PM failed:", e);
      return NextResponse.json({ error: "Invalid or inaccessible payment method" }, { status: 400 });
    }

    if (pmCustomer && pmCustomer !== stripeCustomerId) {
      return NextResponse.json(
        { error: "This payment method is registered to a different customer in Stripe." },
        { status: 400 }
      );
    }

    if (!pmCustomer) {
      if (!listedOnProfile) {
        return NextResponse.json(
          { error: "This card is not listed on the customer profile." },
          { status: 403 }
        );
      }
      try {
        if (stripeOpts) {
          await stripe.paymentMethods.attach(
            stripePaymentMethodId,
            { customer: stripeCustomerId },
            stripeOpts
          );
        } else {
          await stripe.paymentMethods.attach(stripePaymentMethodId, { customer: stripeCustomerId });
        }
      } catch (e) {
        console.warn("[stripe-charge-saved-card] attach PM failed:", e);
        return NextResponse.json(
          {
            error:
              "Could not attach this saved card. The customer may need to pay via checkout or add a card from their profile.",
          },
          { status: 400 }
        );
      }
    }

    try {
      const piParams: Stripe.PaymentIntentCreateParams = {
        amount: amountCents,
        currency: "usd",
        customer: stripeCustomerId,
        payment_method: stripePaymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          booking_id: bookingId,
          business_id: businessId,
          kind: "admin_saved_card",
        },
        description: `Booking ${String(bookingId).slice(0, 8)}…`,
      };

      const pi = stripeOpts
        ? await stripe.paymentIntents.create(piParams, stripeOpts)
        : await stripe.paymentIntents.create(piParams);

      if (pi.status !== "succeeded") {
        return NextResponse.json(
          {
            error: `Charge not completed (status ${pi.status}). The bank may require the customer to pay via a payment link.`,
            paymentIntentStatus: pi.status,
          },
          { status: 402 }
        );
      }

      const { error: upErr } = await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          payment_method: "online",
          payment_provider_session_id: pi.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .eq("business_id", businessId);

      if (upErr) {
        console.error("[stripe-charge-saved-card] booking update failed after PI success:", upErr);
        return NextResponse.json(
          { error: "Charge succeeded but failed to update booking; reconcile in Stripe dashboard.", paymentIntentId: pi.id },
          { status: 500 }
        );
      }

      try {
        const retrieved = stripeOpts
          ? await stripe.paymentIntents.retrieve(pi.id, { expand: ["charges.data.payment_method_details"] }, stripeOpts)
          : await stripe.paymentIntents.retrieve(pi.id, { expand: ["charges.data.payment_method_details"] });
        const charge = retrieved.charges?.data?.[0];
        const card = charge?.payment_method_details?.card;
        if (card?.last4 || card?.brand) {
          await supabase
            .from("bookings")
            .update({
              ...(card.last4 ? { card_last4: card.last4 } : {}),
              ...(card.brand ? { card_brand: card.brand } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq("id", bookingId)
            .eq("business_id", businessId);
        }
      } catch (e) {
        console.warn("[stripe-charge-saved-card] card metadata:", e);
      }

      return NextResponse.json({
        ok: true,
        paymentIntentId: pi.id,
        message: `Charged $${amount.toFixed(2)} successfully.`,
      });
    } catch (e: unknown) {
      const err = e as Stripe.errors.StripeError;
      const msg = err?.message || (e instanceof Error ? e.message : "Charge failed");
      const code = err?.code || "";
      if (code === "authentication_required" || err?.decline_code === "authentication_required") {
        return NextResponse.json(
          {
            error:
              "This card requires additional authentication. Send the customer a payment link or have them complete payment online.",
          },
          { status: 402 }
        );
      }
      console.error("[stripe-charge-saved-card] PI create:", e);
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  } catch (e) {
    console.error("[stripe-charge-saved-card]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
