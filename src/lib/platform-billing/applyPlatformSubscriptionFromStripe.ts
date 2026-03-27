import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  PLATFORM_SUBSCRIPTION_KIND,
  mapStripeStatusToDb,
} from "@/lib/platform-billing/stripePlatformSubscription";

function unixToDateString(unix: number | string | null | undefined): string {
  const num = typeof unix === "string" ? Number(unix) : unix;
  if (typeof num !== "number" || !Number.isFinite(num) || num <= 0) {
    // Some webhook payloads can omit period bounds; keep sync resilient.
    return new Date().toISOString().split("T")[0];
  }
  return new Date(num * 1000).toISOString().split("T")[0];
}

/**
 * After Checkout completes or subscription updates: sync platform_subscriptions + businesses.plan.
 */
export async function syncPlatformSubscriptionRow(params: {
  supabase: SupabaseClient;
  businessId: string;
  planSlug: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  subscription: Stripe.Subscription;
}): Promise<{ error?: string }> {
  const { supabase, businessId, planSlug, stripeCustomerId, stripeSubscriptionId, subscription } =
    params;

  const { data: planRow, error: planErr } = await supabase
    .from("platform_subscription_plans")
    .select("id")
    .eq("slug", planSlug)
    .maybeSingle();

  if (planErr || !planRow) {
    console.error("[Platform billing] Plan not found for slug:", planSlug, planErr);
    return { error: "plan_not_found" };
  }

  const planId = (planRow as { id: string }).id;
  const status = mapStripeStatusToDb(subscription.status);
  const periodStart = unixToDateString(subscription.current_period_start);
  const periodEnd = unixToDateString(subscription.current_period_end);

  const { error: subUp } = await supabase
    .from("platform_subscriptions")
    .update({
      plan_id: planId,
      status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", businessId);

  if (subUp) {
    console.error("[Platform billing] Failed to update platform_subscriptions:", subUp);
    return { error: subUp.message };
  }

  const { error: bizUp } = await supabase
    .from("businesses")
    .update({
      plan: planSlug,
      // Payment gate: account activates only after Stripe reports active/trialing subscription.
      is_active: status === "active" || status === "trialing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  if (bizUp) {
    console.warn("[Platform billing] Failed to update businesses.plan:", bizUp);
  }

  return {};
}

/** Record a paid invoice in platform_payments (idempotent by stripe_invoice_id). */
export async function recordPlatformInvoicePaid(params: {
  supabase: SupabaseClient;
  businessId: string;
  planSlug: string;
  invoice: Stripe.Invoice;
}): Promise<{ skipped?: boolean; error?: string }> {
  const { supabase, businessId, planSlug, invoice } = params;

  if (!invoice.id) return { skipped: true };

  const { data: existing } = await supabase
    .from("platform_payments")
    .select("id")
    .eq("stripe_invoice_id", invoice.id)
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
  const amountCents = invoice.amount_paid ?? 0;
  const currency = (invoice.currency ?? "usd").toLowerCase();
  const paidAt = invoice.status_transitions?.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
    : invoice.created
      ? new Date(invoice.created * 1000).toISOString()
      : new Date().toISOString();

  const description =
    invoice.description ||
    `Subscription – ${planSlug}` ||
    "Platform subscription";

  const { error: ins } = await supabase.from("platform_payments").insert({
    business_id: businessId,
    subscription_id: subscriptionId,
    plan_slug: planSlug,
    amount_cents: amountCents,
    currency,
    paid_at: paidAt,
    status: "paid",
    description,
    stripe_invoice_id: invoice.id,
  });

  if (ins) {
    console.error("[Platform billing] platform_payments insert failed:", ins);
    return { error: ins.message };
  }

  return {};
}

export function isPlatformSubscriptionMetadata(meta: Stripe.Metadata | null | undefined): boolean {
  return meta?.kind === PLATFORM_SUBSCRIPTION_KIND;
}
