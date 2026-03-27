import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  createServiceRoleClient,
} from "@/lib/auth-helpers";
import {
  PLATFORM_SUBSCRIPTION_KIND,
  resolvePlatformStripePriceId,
} from "@/lib/platform-billing/stripePlatformSubscription";
import { ensureStripeEmbeddedReturnUrl } from "@/lib/platform-billing/embeddedCheckoutReturnUrl";

export const dynamic = "force-dynamic";

/** Only allow same-origin full URLs or root-relative paths (open redirect protection). */
function resolveSafeRedirectUrl(
  requested: string | undefined,
  fallback: string,
  origin: string
): string {
  if (!requested?.trim()) return fallback;
  const t = requested.trim();
  try {
    if (t.startsWith("/") && !t.startsWith("//")) {
      return `${origin}${t}`;
    }
    const u = new URL(t);
    const o = new URL(origin || "http://localhost");
    if (u.origin === o.origin) return u.toString();
  } catch {
    return fallback;
  }
  return fallback;
}

/**
 * Start Stripe Checkout in subscription mode for the platform plan (charges your main Stripe account).
 * Body: { businessId: string, planSlug: string }  e.g. "starter" | "growth" | "premium"
 */
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return createUnauthorizedResponse();

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY is not configured" }, { status: 500 });
  }

  let body: {
    businessId?: string;
    planSlug?: string;
    successUrl?: string;
    cancelUrl?: string;
    /** Use Stripe Embedded Checkout (modal) instead of hosted redirect. */
    embedded?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const businessId = body.businessId?.trim();
  const planSlug = (body.planSlug ?? "growth").toLowerCase().trim();
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { data: business, error: bizError } = await admin
    .from("businesses")
    .select("id, owner_id, name")
    .eq("id", businessId)
    .maybeSingle();

  if (bizError || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  if ((business as { owner_id: string | null }).owner_id !== user.id) {
    return NextResponse.json({ error: "Only the business owner can manage platform billing" }, { status: 403 });
  }

  const { data: planRow, error: planError } = await admin
    .from("platform_subscription_plans")
    .select("id, name, slug, amount_cents, billing_interval, stripe_price_id, is_active")
    .eq("slug", planSlug)
    .maybeSingle();

  if (planError || !planRow) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  if ((planRow as { is_active?: boolean }).is_active === false) {
    return NextResponse.json({ error: "This plan is not available for new subscriptions." }, { status: 400 });
  }

  const amountCents = (planRow as { amount_cents: number }).amount_cents ?? 0;

  const priceId = resolvePlatformStripePriceId(
    planSlug,
    (planRow as { stripe_price_id?: string | null }).stripe_price_id
  );

  // Stripe Price ID is the source of truth for charging. DB amount_cents can be 0 until migration 072 runs.
  if (!priceId) {
    if (amountCents <= 0) {
      return NextResponse.json(
        {
          error:
            "This plan has no Stripe price configured and no amount in the database. Add STRIPE_PLATFORM_PRICE_" +
            planSlug.toUpperCase().replace(/-/g, "_") +
            " (or platform_subscription_plans.stripe_price_id), or run migration 072 to set Starter/Growth/Premium amounts.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error:
          "Stripe Price is not configured for this plan. Set platform_subscription_plans.stripe_price_id or env STRIPE_PLATFORM_PRICE_" +
          planSlug.toUpperCase().replace(/-/g, "_") +
          " (legacy: STRIPE_PLATFORM_PRICE_PRO / STRIPE_PLATFORM_PRICE_ENTERPRISE for growth / premium)",
      },
      { status: 400 }
    );
  }

  if (!priceId.startsWith("price_")) {
    return NextResponse.json(
      {
        error:
          `Invalid Stripe ID for plan "${planSlug}": value must be a Price ID starting with price_, not ${priceId.startsWith("prod_") ? "a Product ID (prod_)" : "this value"}. In Stripe open the product → Pricing → copy the Price ID.`,
      },
      { status: 400 }
    );
  }

  const { data: subRow } = await admin
    .from("platform_subscriptions")
    .select("stripe_customer_id")
    .eq("business_id", businessId)
    .maybeSingle();

  const existingCustomerId =
    (subRow as { stripe_customer_id?: string | null } | null)?.stripe_customer_id?.trim() || null;

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    request.headers.get("origin")?.replace(/\/$/, "") ||
    "";

  const defaultSuccess = `${origin}/admin/settings/account?tab=billing&platform_sub=success`;
  const defaultCancel = `${origin}/admin/settings/account?tab=billing&platform_sub=cancel`;

  const successUrl = resolveSafeRedirectUrl(body.successUrl, defaultSuccess, origin);
  const cancelUrl = resolveSafeRedirectUrl(body.cancelUrl, defaultCancel, origin);
  const embedded = body.embedded === true;
  const returnUrlEmbedded = ensureStripeEmbeddedReturnUrl(successUrl);

  const stripe = new Stripe(secret);
  const customerEmail = user.email ?? undefined;

  let session: Stripe.Checkout.Session;
  try {
    const common = {
      mode: "subscription" as const,
      line_items: [{ price: priceId, quantity: 1 }],
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : { customer_email: customerEmail }),
      metadata: {
        kind: PLATFORM_SUBSCRIPTION_KIND,
        business_id: businessId,
        plan_slug: planSlug,
      },
      subscription_data: {
        metadata: {
          kind: PLATFORM_SUBSCRIPTION_KIND,
          business_id: businessId,
          plan_slug: planSlug,
        },
      },
      allow_promotion_codes: true,
    };

    session = embedded
      ? await stripe.checkout.sessions.create({
          ...common,
          ui_mode: "embedded",
          return_url: returnUrlEmbedded,
        })
      : await stripe.checkout.sessions.create({
          ...common,
          success_url: successUrl,
          cancel_url: cancelUrl,
        });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[create-checkout] Stripe error:", msg);
    return NextResponse.json(
      {
        error:
          "Stripe rejected checkout. Confirm env vars use Price IDs (price_...) from Stripe → Product → Pricing, not Product IDs (prod_...).",
        details: msg,
      },
      { status: 400 }
    );
  }

  if (embedded) {
    const clientSecret = session.client_secret;
    if (!clientSecret) {
      return NextResponse.json(
        { error: "Stripe did not return an embedded checkout client secret" },
        { status: 500 }
      );
    }
    return NextResponse.json({
      clientSecret,
      sessionId: session.id,
    });
  }

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 500 });
  }

  return NextResponse.json({
    url: session.url,
    sessionId: session.id,
  });
}
