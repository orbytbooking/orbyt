import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type BillingCard = {
  brand: string;
  last4: string;
  expMonth?: number | null;
  expYear?: number | null;
  stripePaymentMethodId?: string | null;
  createdAt?: string;
  source?: "stripe" | "manual" | string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const setupIntentId = typeof body.setupIntentId === "string" ? body.setupIntentId.trim() : "";
    if (!token || !setupIntentId) {
      return NextResponse.json({ error: "token and setupIntentId are required" }, { status: 400 });
    }

    const supabase = getAdmin();
    if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

    const { data: link, error: linkErr } = await supabase
      .from("customer_add_card_links")
      .select("id, business_id, customer_id, expires_at, used_at")
      .eq("token", token)
      .single();
    if (linkErr || !link) return NextResponse.json({ error: "invalid_link" }, { status: 404 });
    if ((link as any).used_at) return NextResponse.json({ error: "link_used" }, { status: 409 });
    const expiresAt = new Date((link as any).expires_at);
    if (Date.now() > expiresAt.getTime()) return NextResponse.json({ error: "link_expired" }, { status: 410 });

    const businessId = (link as any).business_id as string;
    const customerId = (link as any).customer_id as string;

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("payment_provider, stripe_connect_account_id, stripe_secret_key")
      .eq("id", businessId)
      .single();
    if (bizErr || !biz) return NextResponse.json({ error: "business_not_found" }, { status: 404 });
    const b = biz as {
      payment_provider?: string | null;
      stripe_connect_account_id?: string | null;
      stripe_secret_key?: string | null;
    };
    if (b.payment_provider === "authorize_net") return NextResponse.json({ error: "stripe_not_enabled" }, { status: 400 });
    const skRaw = b.stripe_secret_key != null ? String(b.stripe_secret_key).trim() : "";
    const stripeSecretKey = skRaw !== "" ? skRaw : null;
    const stripeConnectAccountId = b.stripe_connect_account_id ?? null;
    const secretKey = stripeSecretKey ?? process.env.STRIPE_SECRET_KEY ?? null;
    if (!secretKey) return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });

    const stripe = new Stripe(secretKey);
    const stripeOpts = stripeSecretKey == null && stripeConnectAccountId ? { stripeAccount: stripeConnectAccountId } : undefined;

    const si = stripeOpts
      ? await stripe.setupIntents.retrieve(setupIntentId, stripeOpts)
      : await stripe.setupIntents.retrieve(setupIntentId);
    const pmId =
      typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id ?? null;
    if (!pmId) return NextResponse.json({ error: "setup_intent_missing_payment_method" }, { status: 400 });

    const pm = stripeOpts
      ? await stripe.paymentMethods.retrieve(pmId, stripeOpts)
      : await stripe.paymentMethods.retrieve(pmId);
    const card = (pm as Stripe.PaymentMethod).card;
    if (!card?.last4) return NextResponse.json({ error: "payment_method_missing_card_details" }, { status: 400 });

    const newCard: BillingCard = {
      brand: card.brand || "Card",
      last4: card.last4,
      expMonth: card.exp_month ?? null,
      expYear: card.exp_year ?? null,
      stripePaymentMethodId: pmId,
      createdAt: new Date().toISOString(),
      source: "stripe",
    };

    const { data: cust, error: custErr } = await supabase
      .from("customers")
      .select("billing_cards, stripe_customer_id")
      .eq("id", customerId)
      .eq("business_id", businessId)
      .single();
    if (custErr || !cust) return NextResponse.json({ error: "customer_not_found" }, { status: 404 });

    const existing: BillingCard[] = Array.isArray((cust as any).billing_cards) ? (cust as any).billing_cards : [];
    const deduped = existing.filter((c) => {
      const samePm = c?.stripePaymentMethodId && c.stripePaymentMethodId === pmId;
      const sameLast4 = String(c?.last4 || "") === String(newCard.last4);
      return !(samePm || sameLast4);
    });
    const next = [newCard, ...deduped];

    const stripeCustomerId =
      (typeof si.customer === "string" ? si.customer : si.customer?.id) ??
      (cust as any).stripe_customer_id ??
      null;

    await supabase
      .from("customers")
      .update({
        billing_cards: next,
        ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", customerId)
      .eq("business_id", businessId);

    await supabase
      .from("customer_add_card_links")
      .update({ used_at: new Date().toISOString() })
      .eq("id", (link as any).id);

    return NextResponse.json({ ok: true, card: newCard });
  } catch (e) {
    console.error("[stripe/customer-add-card/link/complete]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

