import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/auth-helpers";
import {
  PLATFORM_PENDING_OWNER_KIND,
  resolvePlatformStripePriceId,
} from "@/lib/platform-billing/stripePlatformSubscription";
import { ensureStripeEmbeddedReturnUrl } from "@/lib/platform-billing/embeddedCheckoutReturnUrl";

export const dynamic = "force-dynamic";

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
 * Start Stripe Checkout for a pending owner (no Supabase session yet).
 * Body: { pendingId, planSlug?, successUrl?, cancelUrl? }
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY is not configured" }, { status: 500 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body: {
    pendingId?: string;
    planSlug?: string;
    successUrl?: string;
    cancelUrl?: string;
    embedded?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pendingId = body.pendingId?.trim();
  if (!pendingId) {
    return NextResponse.json({ error: "pendingId is required" }, { status: 400 });
  }

  const { data: pendingRow, error: pendErr } = await admin
    .from("pending_owner_onboarding")
    .select("id, email, payload, consumed_at")
    .eq("id", pendingId)
    .maybeSingle();

  if (pendErr || !pendingRow) {
    return NextResponse.json({ error: "Pending onboarding not found" }, { status: 404 });
  }

  if ((pendingRow as { consumed_at?: string | null }).consumed_at) {
    return NextResponse.json({ error: "This onboarding was already completed" }, { status: 400 });
  }

  const payload = (pendingRow as { payload: { plan?: string } }).payload;
  const planSlug = (body.planSlug ?? payload.plan ?? "starter").toString().toLowerCase().trim();

  const { data: planRow, error: planError } = await admin
    .from("platform_subscription_plans")
    .select("id, name, slug, amount_cents, stripe_price_id, is_active")
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

  if (!priceId) {
    if (amountCents <= 0) {
      return NextResponse.json(
        {
          error:
            "This plan has no Stripe price configured. Add STRIPE_PLATFORM_PRICE_" +
            planSlug.toUpperCase().replace(/-/g, "_") +
            " or platform_subscription_plans.stripe_price_id.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Stripe Price is not configured for this plan." },
      { status: 400 }
    );
  }

  if (!priceId.startsWith("price_")) {
    return NextResponse.json(
      {
        error:
          `Invalid Stripe ID for plan "${planSlug}": use a Price ID (price_...), not a Product ID.`,
      },
      { status: 400 }
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    request.headers.get("origin")?.replace(/\/$/, "") ||
    "";

  const defaultSuccess = `${origin}/auth/onboarding/complete?stripe_session_id={CHECKOUT_SESSION_ID}`;
  const defaultCancel = `${origin}/auth/onboarding?payment=cancel&pending=${encodeURIComponent(pendingId)}`;

  const successUrl = resolveSafeRedirectUrl(body.successUrl, defaultSuccess, origin);
  const cancelUrl = resolveSafeRedirectUrl(body.cancelUrl, defaultCancel, origin);
  const embedded = body.embedded === true;
  const returnUrlEmbedded = ensureStripeEmbeddedReturnUrl(successUrl);

  const email = (pendingRow as { email: string }).email.trim();

  const stripe = new Stripe(secret);
  let session: Stripe.Checkout.Session;
  try {
    const common = {
      mode: "subscription" as const,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      client_reference_id: pendingId,
      metadata: {
        kind: PLATFORM_PENDING_OWNER_KIND,
        pending_id: pendingId,
        plan_slug: planSlug,
      },
      subscription_data: {
        metadata: {
          kind: PLATFORM_PENDING_OWNER_KIND,
          pending_id: pendingId,
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
    console.error("[create-checkout-pending] Stripe error:", msg);
    return NextResponse.json(
      {
        error: "Stripe rejected checkout.",
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
