import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  createServiceRoleClient,
} from "@/lib/auth-helpers";
import { getPlatformBillingProvider } from "@/lib/platform-billing/platformBillingProvider";

export const dynamic = "force-dynamic";

/**
 * Stripe Customer Portal for the platform subscription (manage card, cancel, etc.).
 * Body: { businessId: string }
 */
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return createUnauthorizedResponse();

  if (getPlatformBillingProvider() === "authorize_net") {
    return NextResponse.json(
      {
        error:
          "Self-serve billing portal is not wired for Authorize.Net platform subscriptions yet. Contact Orbyt support to update your card or cancel.",
        code: "authorize_net_portal",
      },
      { status: 501 }
    );
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY is not configured" }, { status: 500 });
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

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { data: business, error: bizError } = await admin
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .maybeSingle();

  if (bizError || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  if ((business as { owner_id: string | null }).owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: subRow } = await admin
    .from("platform_subscriptions")
    .select("stripe_customer_id")
    .eq("business_id", businessId)
    .maybeSingle();

  const customerId = (subRow as { stripe_customer_id?: string | null } | null)?.stripe_customer_id?.trim();
  if (!customerId) {
    return NextResponse.json(
      { error: "No Stripe customer yet. Subscribe to a paid plan first." },
      { status: 400 }
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    request.headers.get("origin")?.replace(/\/$/, "") ||
    "";

  const returnUrl = `${origin}/admin/settings/account?tab=billing`;

  const stripe = new Stripe(secret);
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: portal.url });
}
