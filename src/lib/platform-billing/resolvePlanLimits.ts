import type { SupabaseClient } from "@supabase/supabase-js";

/** Limits from `platform_subscription_plans`; `null` on a cap = unlimited. */
export type PlatformPlanLimits = {
  max_calendars: number | null;
};

const unlimited = (): PlatformPlanLimits => ({ max_calendars: null });

/**
 * Resolves plan limits for a business: prefer `platform_subscriptions.plan_id`,
 * else fall back to `businesses.plan` slug → `platform_subscription_plans`.
 */
export async function getPlatformPlanLimitsForBusiness(
  admin: SupabaseClient,
  businessId: string
): Promise<PlatformPlanLimits> {
  try {
    const { data: sub, error: subErr } = await admin
      .from("platform_subscriptions")
      .select("plan_id")
      .eq("business_id", businessId)
      .maybeSingle();

    let planId: string | null = null;
    if (!subErr && sub && (sub as { plan_id?: string }).plan_id) {
      planId = (sub as { plan_id: string }).plan_id;
    }

    if (!planId) {
      const { data: biz } = await admin.from("businesses").select("plan").eq("id", businessId).maybeSingle();
      const slug = ((biz as { plan?: string } | null)?.plan || "starter").toString().toLowerCase().trim();
      const { data: bySlug } = await admin
        .from("platform_subscription_plans")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      planId = (bySlug as { id: string } | null)?.id ?? null;
    }

    if (!planId) {
      return unlimited();
    }

    const { data: plan, error: planErr } = await admin
      .from("platform_subscription_plans")
      .select("max_calendars")
      .eq("id", planId)
      .maybeSingle();

    if (planErr || !plan) {
      return unlimited();
    }

    const mc = (plan as { max_calendars?: number | null }).max_calendars;
    return { max_calendars: mc === undefined ? null : mc };
  } catch (e) {
    console.warn("[resolvePlanLimits] getPlatformPlanLimitsForBusiness:", e);
    return unlimited();
  }
}
