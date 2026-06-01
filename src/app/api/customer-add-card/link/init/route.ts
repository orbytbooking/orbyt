import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getAcceptJsScriptUrl } from "@/lib/payments/authorizeNetMerchantApi";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function loadLink(supabase: ReturnType<typeof getAdmin>, token: string) {
  if (!supabase) return { error: NextResponse.json({ error: "Server not configured" }, { status: 500 }) };

  const { data: link, error: linkErr } = await supabase
    .from("customer_add_card_links")
    .select("id, business_id, customer_id, expires_at, used_at")
    .eq("token", token)
    .single();

  if (linkErr || !link) return { error: NextResponse.json({ error: "invalid_link" }, { status: 404 }) };
  if ((link as { used_at?: string | null }).used_at) {
    return { error: NextResponse.json({ error: "link_used" }, { status: 409 }) };
  }

  const expiresAt = new Date((link as { expires_at: string }).expires_at);
  if (Date.now() > expiresAt.getTime()) {
    return { error: NextResponse.json({ error: "link_expired" }, { status: 410 }) };
  }

  return {
    link: link as {
      id: string;
      business_id: string;
      customer_id: string;
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

    const supabase = getAdmin();
    const loaded = await loadLink(supabase, token);
    if ("error" in loaded && loaded.error) return loaded.error;

    const { link } = loaded;
    const businessId = link.business_id;
    const customerId = link.customer_id;

    const { data: biz, error: bizErr } = await supabase!
      .from("businesses")
      .select(
        "payment_provider, stripe_connect_account_id, stripe_secret_key, stripe_publishable_key, authorize_net_api_login_id, authorize_net_transaction_key, authorize_net_public_client_key"
      )
      .eq("id", businessId)
      .single();

    if (bizErr || !biz) return NextResponse.json({ error: "business_not_found" }, { status: 404 });

    const b = biz as {
      payment_provider?: string | null;
      stripe_connect_account_id?: string | null;
      stripe_secret_key?: string | null;
      stripe_publishable_key?: string | null;
      authorize_net_api_login_id?: string | null;
      authorize_net_transaction_key?: string | null;
      authorize_net_public_client_key?: string | null;
    };

    if (b.payment_provider === "authorize_net") {
      const apiLoginId = b.authorize_net_api_login_id?.trim() || "";
      const transactionKey = b.authorize_net_transaction_key?.trim() || "";
      const publicClientKey = b.authorize_net_public_client_key?.trim() || "";
      if (!apiLoginId || !transactionKey) {
        return NextResponse.json({ error: "authorize_net_not_configured" }, { status: 500 });
      }
      if (!publicClientKey) {
        return NextResponse.json({ error: "authorize_net_public_client_key_missing" }, { status: 500 });
      }
      return NextResponse.json({
        provider: "authorize_net",
        businessId,
        customerId,
        apiLoginId,
        publicClientKey,
        acceptJsUrl: getAcceptJsScriptUrl(),
      });
    }

    const skRaw = b.stripe_secret_key != null ? String(b.stripe_secret_key).trim() : "";
    const stripeSecretKey = skRaw !== "" ? skRaw : null;
    const stripeConnectAccountId = b.stripe_connect_account_id ?? null;
    const publishableKey =
      (b.stripe_publishable_key != null && String(b.stripe_publishable_key).trim() !== ""
        ? String(b.stripe_publishable_key).trim()
        : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) ?? null;
    const secretKey = stripeSecretKey ?? process.env.STRIPE_SECRET_KEY ?? null;

    if (!secretKey || !publishableKey) {
      return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 });
    }

    const { data: cust, error: custErr } = await supabase!
      .from("customers")
      .select("id, name, email, stripe_customer_id")
      .eq("id", customerId)
      .eq("business_id", businessId)
      .single();

    if (custErr || !cust) return NextResponse.json({ error: "customer_not_found" }, { status: 404 });

    const stripe = new Stripe(secretKey);
    const stripeOpts =
      stripeSecretKey == null && stripeConnectAccountId ? { stripeAccount: stripeConnectAccountId } : undefined;

    let stripeCustomerId = (cust as { stripe_customer_id?: string | null }).stripe_customer_id ?? null;
    if (!stripeCustomerId) {
      const created = stripeOpts
        ? await stripe.customers.create(
            {
              email: (cust as { email?: string }).email,
              name: (cust as { name?: string }).name,
              metadata: { business_id: businessId, customer_id: customerId, kind: "orbyt_customer" },
            },
            stripeOpts
          )
        : await stripe.customers.create({
            email: (cust as { email?: string }).email,
            name: (cust as { name?: string }).name,
            metadata: { business_id: businessId, customer_id: customerId, kind: "orbyt_customer" },
          });
      stripeCustomerId = created.id;
      await supabase!
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
              link_id: link.id,
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
            link_id: link.id,
          },
        });

    if (!intent.client_secret) {
      return NextResponse.json({ error: "setup_intent_failed" }, { status: 500 });
    }

    return NextResponse.json({
      provider: "stripe",
      clientSecret: intent.client_secret,
      setupIntentId: intent.id,
      publishableKey,
      stripeConnectAccountId: stripeSecretKey == null ? stripeConnectAccountId : null,
      businessId,
      customerId,
    });
  } catch (e) {
    console.error("[customer-add-card/link/init]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
