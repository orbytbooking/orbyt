import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getAuthenticatedUser,
} from "@/lib/auth-helpers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    if (user.user_metadata?.role === "customer") return createForbiddenResponse("Access denied");

    const body = await request.json().catch(() => ({}));
    const businessId = typeof body.businessId === "string" ? body.businessId.trim() : "";
    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    if (!businessId || !customerId) {
      return NextResponse.json({ error: "businessId and customerId are required" }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    // Ensure caller owns this business (same pattern as other admin APIs).
    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("id, owner_id, payment_provider, stripe_connect_account_id, stripe_secret_key, stripe_publishable_key")
      .eq("id", businessId)
      .single();
    if (bizErr || !biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    if ((biz as { owner_id?: string | null }).owner_id !== user.id) {
      return createForbiddenResponse("Access denied to this business");
    }

    const b = biz as {
      payment_provider?: string | null;
      stripe_connect_account_id?: string | null;
      stripe_secret_key?: string | null;
      stripe_publishable_key?: string | null;
    };
    if (b.payment_provider === "authorize_net") {
      return NextResponse.json({ error: "Stripe is not enabled for this business" }, { status: 400 });
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
      return NextResponse.json(
        { error: "Stripe keys are not configured. Set publishable and secret keys in Billing settings." },
        { status: 500 }
      );
    }

    const { data: custRow, error: custErr } = await supabase
      .from("customers")
      .select("id, name, email, stripe_customer_id, business_id")
      .eq("id", customerId)
      .eq("business_id", businessId)
      .single();
    if (custErr || !custRow) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const stripe = new Stripe(secretKey);
    const stripeOpts = stripeSecretKey == null && stripeConnectAccountId ? { stripeAccount: stripeConnectAccountId } : undefined;

    let stripeCustomerId = (custRow as { stripe_customer_id?: string | null }).stripe_customer_id ?? null;
    if (!stripeCustomerId) {
      const created = stripeOpts
        ? await stripe.customers.create(
            {
              email: (custRow as { email?: string }).email,
              name: (custRow as { name?: string }).name,
              metadata: { business_id: businessId, customer_id: customerId, kind: "orbyt_customer" },
            },
            stripeOpts
          )
        : await stripe.customers.create({
            email: (custRow as { email?: string }).email,
            name: (custRow as { name?: string }).name,
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
            metadata: { business_id: businessId, customer_id: customerId, kind: "customer_add_card" },
          },
          stripeOpts
        )
      : await stripe.setupIntents.create({
          customer: stripeCustomerId,
          usage: "off_session",
          payment_method_types: ["card"],
          metadata: { business_id: businessId, customer_id: customerId, kind: "customer_add_card" },
        });

    if (!intent.client_secret) {
      return NextResponse.json({ error: "Failed to initialize card setup" }, { status: 500 });
    }

    return NextResponse.json({
      clientSecret: intent.client_secret,
      setupIntentId: intent.id,
      publishableKey,
      stripeConnectAccountId: stripeSecretKey == null ? stripeConnectAccountId : null,
    });
  } catch (e) {
    console.error("[stripe/customer-add-card/setup-intent]", e);
    const msg = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

