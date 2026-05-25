import { NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  createServiceRoleClient,
} from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * Ensures a `platform_subscriptions` row exists for the business and matches the chosen plan.
 * Call after creating a business (e.g. onboarding) so billing + webhooks can resolve the row.
 *
 * Body: { businessId: string, planSlug?: string } — planSlug defaults to `businesses.plan`.
 */
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return createUnauthorizedResponse();

  let body: { businessId?: string; planSlug?: string };
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
    .select("id, owner_id, plan")
    .eq("id", businessId)
    .maybeSingle();

  if (bizError || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  if ((business as { owner_id: string | null }).owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const slug = (body.planSlug ?? (business as { plan?: string }).plan ?? "starter")
    .toString()
    .toLowerCase()
    .trim();

  const { data: planRow, error: planError } = await admin
    .from("platform_subscription_plans")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (planError || !planRow) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const planId = (planRow as { id: string }).id;
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startStr = periodStart.toISOString().split("T")[0];
  const endStr = periodEnd.toISOString().split("T")[0];

  const { data: existing } = await admin
    .from("platform_subscriptions")
    .select("id")
    .eq("business_id", businessId)
    .maybeSingle();

  if (existing) {
    const { error: up } = await admin
      .from("platform_subscriptions")
      .update({
        plan_id: planId,
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);

    if (up) {
      console.error("[ensure-subscription] update failed:", up);
      return NextResponse.json({ error: up.message }, { status: 500 });
    }
  } else {
    const { error: ins } = await admin.from("platform_subscriptions").insert({
      business_id: businessId,
      plan_id: planId,
      status: "active",
      current_period_start: startStr,
      current_period_end: endStr,
    });

    if (ins) {
      console.error("[ensure-subscription] insert failed:", ins);
      return NextResponse.json({ error: ins.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
