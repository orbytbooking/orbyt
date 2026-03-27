import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireSuperAdminGate } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * Super Admin: open Stripe Customer Portal for any business.
 * Body: { businessId: string }
 */
export async function POST(request: Request) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY is not configured" },
      { status: 500 }
    );
  }

  let body: { businessId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const businessId = body.businessId?.trim();
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  const { admin } = gate;

  const { data: subRow, error: subErr } = await admin
    .from("platform_subscriptions")
    .select("stripe_customer_id")
    .eq("business_id", businessId)
    .maybeSingle();

  if (subErr || !subRow) {
    return NextResponse.json(
      { error: "Subscription record not found for this business" },
      { status: 404 }
    );
  }

  const customerId = (subRow as { stripe_customer_id?: string | null }).stripe_customer_id?.trim();
  if (!customerId) {
    return NextResponse.json(
      { error: "No Stripe customer yet. Subscribe to a paid plan first." },
      { status: 400 }
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    request.headers.get("origin")?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const returnUrl = `${origin}/super-admin/dashboard`;
  const stripe = new Stripe(secret);

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: portal.url });
}

