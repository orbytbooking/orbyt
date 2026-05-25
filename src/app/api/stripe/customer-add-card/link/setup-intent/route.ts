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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

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
      .select("payment_provider, stripe_connect_account_id, stripe_secret_key, stripe_publishable_key")
      .eq("id", businessId)
      .single();
    if (bizErr || !biz) return NextResponse.json({ error: "business_not_found" }, { status: 404 });
    const b = biz as {
      payment_provider?: string | null;
      stripe_connect_account_id?: string | null;
      stripe_secret_key?: string | null;
      stripe_publishable_key?: string | null;
    };
    if (b.payment_provider === "authorize_net") return NextResponse.json({ error: "stripe_not_enabled" }, { status: 400 });

    const skRaw = b.stripe_secret_key != null ? String(b.stripe_secret_key).trim() : "";
    const stripeSecretKey = skRaw !== "" ? skRaw : null;
    const stripeConnectAccountId = b.stripe_connect_account_id ?? null;
    const publishableKey =
      (b.stripe_publishable_key != null && String(b.stripe_publishable_key).trim() !== ""
        ? String(b.stripe_publishable_key).trim()
        : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) ?? null;
    const secretKey = stripeSecretKey ?? process.env.STRIPE_SECRET_KEY ?? null;
    if (!secretKey || !publishableKey) return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });

    const { data: cust, error: custErr } = await supabase
      .from("customers")
      .select("id, name, email, stripe_customer_id")
      .eq("id", customerId)
      .eq("business_id", businessId)
      .single();
    if (custErr || !cust) return NextResponse.json({ error: "customer_not_found" }, { status: 404 });

    const stripe = new Stripe(secretKey);
    const stripeOpts = stripeSecretKey == null && stripeConnectAccountId ? { stripeAccount: stripeConnectAccountId } : undefined;

    let stripeCustomerId = (cust as any).stripe_customer_id ?? null;
    if (!stripeCustomerId) {
      const created = stripeOpts
        ? await stripe.customers.create(
            {
              email: (cust as any).email,
              name: (cust as any).name,
              metadata: { business_id: businessId, customer_id: customerId, kind: "orbyt_customer" },
            },
            stripeOpts
          )
        : await stripe.customers.create({
            email: (cust as any).email,
            name: (cust as any).name,
            metadata: { business_id: businessId, customer_id: customerId, kind: "orbyt_customer" },
          });
      stripeCustomerId = created.id;
      await supabase
        .from("customers")
        .update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() })
        .eq("id", customerId)
        .eq("business_id", businessId);
    }

    const intent = stripeOpts
      ? await stripe.setupIntents.create(
          {
            customer: stripeCustomerId,
            usage: "off_session",
            payment_method_types: ["card"],
            metadata: {
              business_id: businessId,
              customer_id: customerId,
              kind: "customer_add_card_link",
              link_id: (link as any).id,
            },
          },
          stripeOpts
        )
      : await stripe.setupIntents.create({
          customer: stripeCustomerId,
          usage: "off_session",
          payment_method_types: ["card"],
          metadata: {
            business_id: businessId,
            customer_id: customerId,
            kind: "customer_add_card_link",
            link_id: (link as any).id,
          },
        });

    if (!intent.client_secret) return NextResponse.json({ error: "setup_intent_failed" }, { status: 500 });

    return NextResponse.json({
      clientSecret: intent.client_secret,
      setupIntentId: intent.id,
      publishableKey,
      stripeConnectAccountId: stripeSecretKey == null ? stripeConnectAccountId : null,
      businessId,
      customerId,
    });
  } catch (e) {
    console.error("[stripe/customer-add-card/link/setup-intent]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

