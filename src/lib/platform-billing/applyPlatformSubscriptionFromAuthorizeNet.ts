import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sync platform_subscriptions + businesses after Authorize.Net ARB is created for a paid period.
 */
export async function syncPlatformSubscriptionAuthorizeNetRow(params: {
  supabase: SupabaseClient;
  businessId: string;
  planSlug: string;
  customerProfileId: string;
  paymentProfileId: string;
  arbSubscriptionId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}): Promise<{ error?: string }> {
  const {
    supabase,
    businessId,
    planSlug,
    customerProfileId,
    paymentProfileId,
    arbSubscriptionId,
    currentPeriodStart,
    currentPeriodEnd,
  } = params;

  const { data: planRow, error: planErr } = await supabase
    .from("platform_subscription_plans")
    .select("id")
    .eq("slug", planSlug)
    .maybeSingle();

  if (planErr || !planRow) {
    console.error("[Platform billing Authorize.Net] Plan not found:", planSlug, planErr);
    return { error: "plan_not_found" };
  }

  const planId = (planRow as { id: string }).id;

  const { error: subUp } = await supabase
    .from("platform_subscriptions")
    .update({
      plan_id: planId,
      status: "active",
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      authorize_net_customer_profile_id: customerProfileId,
      authorize_net_payment_profile_id: paymentProfileId,
      authorize_net_subscription_id: arbSubscriptionId,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", businessId);

  if (subUp) {
    console.error("[Platform billing Authorize.Net] platform_subscriptions update failed:", subUp);
    return { error: subUp.message };
  }

  const { error: bizUp } = await supabase
    .from("businesses")
    .update({
      plan: planSlug,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  if (bizUp) {
    console.warn("[Platform billing Authorize.Net] businesses.plan update:", bizUp);
  }

  return {};
}

export async function recordPlatformPaymentAuthorizeNet(params: {
  supabase: SupabaseClient;
  businessId: string;
  planSlug: string;
  amountCents: number;
  transId: string;
  description?: string;
}): Promise<{ skipped?: boolean; error?: string }> {
  const { supabase, businessId, planSlug, amountCents, transId, description } = params;

  const { data: existing } = await supabase
    .from("platform_payments")
    .select("id")
    .eq("authorize_net_trans_id", transId)
    .maybeSingle();

  if (existing) {
    return { skipped: true };
  }

  const { data: subRow } = await supabase
    .from("platform_subscriptions")
    .select("id")
    .eq("business_id", businessId)
    .maybeSingle();

  const subscriptionId = subRow ? (subRow as { id: string }).id : null;
  const paidAt = new Date().toISOString();

  const { error: insErr } = await supabase.from("platform_payments").insert({
    business_id: businessId,
    subscription_id: subscriptionId,
    plan_slug: planSlug,
    amount_cents: amountCents,
    currency: "usd",
    paid_at: paidAt,
    status: "paid",
    description: description ?? `Subscription – ${planSlug}`,
    authorize_net_trans_id: transId,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      return { skipped: true };
    }
    console.error("[Platform billing Authorize.Net] platform_payments insert:", insErr);
    return { error: insErr.message };
  }

  return {};
}
