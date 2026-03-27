import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  createServiceRoleClient,
} from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** Current platform subscription + plan for a business (owner only). */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return createUnauthorizedResponse();

  const businessId = request.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId query required" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { data: business, error: bizError } = await admin
    .from("businesses")
    .select("id, owner_id, plan")
    .eq("id", businessId)
    .maybeSingle();

  if (bizError || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  if ((business as { owner_id: string | null }).owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: sub } = await admin
    .from("platform_subscriptions")
    .select(
      "id, status, current_period_start, current_period_end, stripe_customer_id, stripe_subscription_id, plan_id"
    )
    .eq("business_id", businessId)
    .maybeSingle();

  let plan: {
    id: string;
    name: string;
    slug: string;
    amount_cents: number;
    billing_interval: string;
    stripe_price_id: string | null;
  } | null = null;

  if (sub?.plan_id) {
    const { data: planRow } = await admin
      .from("platform_subscription_plans")
      .select("id, name, slug, amount_cents, billing_interval, stripe_price_id")
      .eq("id", (sub as { plan_id: string }).plan_id)
      .maybeSingle();
    if (planRow) plan = planRow as typeof plan;
  }

  const { data: payments } = await admin
    .from("platform_payments")
    .select("id, amount_cents, currency, paid_at, status, description, stripe_invoice_id")
    .eq("business_id", businessId)
    .order("paid_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    businessPlan: (business as { plan: string }).plan,
    subscription: sub
      ? {
          id: (sub as { id: string }).id,
          status: (sub as { status: string }).status,
          currentPeriodStart: (sub as { current_period_start?: string }).current_period_start ?? null,
          currentPeriodEnd: (sub as { current_period_end?: string }).current_period_end ?? null,
          stripeCustomerId: (sub as { stripe_customer_id?: string | null }).stripe_customer_id ?? null,
          stripeSubscriptionId: (sub as { stripe_subscription_id?: string | null }).stripe_subscription_id ?? null,
        }
      : null,
    plan,
    recentPayments: payments ?? [],
  });
}
