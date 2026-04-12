import type { SupabaseClient } from "@supabase/supabase-js";
import { PENDING_OWNER_EMAIL_CONFLICT_MESSAGE } from "@/lib/auth-helpers";
import { syncPlatformSubscriptionAuthorizeNetRow } from "@/lib/platform-billing/applyPlatformSubscriptionFromAuthorizeNet";
import { decryptPendingOwnerPassword } from "@/lib/pendingOwnerCrypto";
import type { PendingOwnerPayload } from "@/lib/webhooks/processPendingOwnerCheckout";

function sanitizeOwnerEmail(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\u200b-\u200d\ufeff]/g, "");
}

/**
 * After Authorize.Net Accept Hosted + ARB for a pending owner: create auth user, business, profile,
 * platform_subscriptions (Authorize.Net fields). Idempotent via pending_owner_onboarding.consumed_at.
 */
export async function processPendingOwnerAuthorizeNet(params: {
  supabase: SupabaseClient;
  pendingId: string;
  customerProfileId: string;
  paymentProfileId: string;
  arbSubscriptionId: string;
  planSlug: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}): Promise<
  | { ok: true; skipped?: boolean; userId?: string; businessId?: string; email?: string }
  | { ok: false; error: string }
> {
  const {
    supabase,
    pendingId,
    customerProfileId,
    paymentProfileId,
    arbSubscriptionId,
    planSlug,
    currentPeriodStart,
    currentPeriodEnd,
  } = params;

  const { data: pendingRow, error: pendingErr } = await supabase
    .from("pending_owner_onboarding")
    .select("id, email, password_encrypted, payload, consumed_at, auth_user_id")
    .eq("id", pendingId)
    .maybeSingle();

  if (pendingErr || !pendingRow) {
    console.error("[pendingOwner AuthNet] pending row not found:", pendingId, pendingErr);
    return { ok: false, error: "pending_not_found" };
  }

  const consumed = (pendingRow as { consumed_at?: string | null }).consumed_at;
  if (consumed) {
    const rowEmail = (pendingRow as { email: string }).email?.trim().toLowerCase();
    return {
      ok: true,
      skipped: true,
      userId: (pendingRow as { auth_user_id?: string | null }).auth_user_id ?? undefined,
      email: rowEmail,
    };
  }

  const email = sanitizeOwnerEmail((pendingRow as { email: string }).email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "invalid_email_in_pending_row" };
  }

  let passwordPlain: string;
  try {
    passwordPlain = decryptPendingOwnerPassword(
      (pendingRow as { password_encrypted: string }).password_encrypted
    );
  } catch (e) {
    console.error("[pendingOwner AuthNet] decrypt failed:", e);
    return { ok: false, error: "decrypt_failed" };
  }

  const payload = (pendingRow as { payload: PendingOwnerPayload }).payload;
  const slug = planSlug.toString().toLowerCase().trim();

  let userId: string | null = null;

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password: passwordPlain,
    email_confirm: true,
  });

  if (createErr) {
    const msg = createErr.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered") || msg.includes("duplicate")) {
      console.warn("[pendingOwner AuthNet] createUser rejected duplicate email:", email);
      return { ok: false, error: PENDING_OWNER_EMAIL_CONFLICT_MESSAGE };
    }
    console.error("[pendingOwner AuthNet] createUser:", createErr);
    return { ok: false, error: createErr.message };
  } else if (created?.user?.id) {
    userId = created.user.id;
    await supabase.auth.admin
      .updateUserById(created.user.id, {
        user_metadata: {
          full_name: payload.fullName,
          role: "owner",
          phone: payload.phone || "",
        },
      })
      .catch((e) => console.warn("[pendingOwner AuthNet] updateUser metadata:", e));
  }

  if (!userId) {
    return { ok: false, error: "no_user_id" };
  }

  let businessId: string;
  const { data: existingBySub } = await supabase
    .from("platform_subscriptions")
    .select("business_id")
    .eq("authorize_net_subscription_id", arbSubscriptionId)
    .maybeSingle();
  if (existingBySub?.business_id) {
    businessId = (existingBySub as { business_id: string }).business_id;
  } else {
    const { data: existingBiz } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingBiz?.id) {
      businessId = (existingBiz as { id: string }).id;
    } else {
      const { data: business, error: bizErr } = await supabase
        .from("businesses")
        .insert({
          name: payload.businessName,
          address: payload.businessAddress ?? null,
          category: payload.businessCategory,
          owner_id: userId,
          plan: slug,
          is_active: false,
        })
        .select("id")
        .single();

      if (bizErr || !business) {
        console.error("[pendingOwner AuthNet] business insert:", bizErr);
        return { ok: false, error: bizErr?.message ?? "business_insert_failed" };
      }
      businessId = (business as { id: string }).id;
    }
  }

  await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        full_name: payload.fullName,
        phone: payload.phone || "",
        role: "owner",
        business_id: businessId,
        is_active: true,
      },
      { onConflict: "id" }
    )
    .then(({ error }) => {
      if (error) console.warn("[pendingOwner AuthNet] profile upsert:", error);
    });

  const { data: planRow, error: planErr } = await supabase
    .from("platform_subscription_plans")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (planErr || !planRow) {
    console.error("[pendingOwner AuthNet] plan not found:", slug, planErr);
    return { ok: false, error: "plan_not_found" };
  }

  const planId = (planRow as { id: string }).id;

  const { error: subInsErr } = await supabase.from("platform_subscriptions").upsert(
    {
      business_id: businessId,
      plan_id: planId,
      status: "active",
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      authorize_net_customer_profile_id: customerProfileId,
      authorize_net_payment_profile_id: paymentProfileId,
      authorize_net_subscription_id: arbSubscriptionId,
    },
    { onConflict: "business_id" }
  );

  if (subInsErr) {
    console.error("[pendingOwner AuthNet] platform_subscriptions upsert:", subInsErr);
    return { ok: false, error: subInsErr.message };
  }

  const syncErr = await syncPlatformSubscriptionAuthorizeNetRow({
    supabase,
    businessId,
    planSlug: slug,
    customerProfileId,
    paymentProfileId,
    arbSubscriptionId,
    currentPeriodStart,
    currentPeriodEnd,
  });

  if (syncErr.error) {
    console.error("[pendingOwner AuthNet] sync:", syncErr.error);
    return { ok: false, error: syncErr.error };
  }

  await supabase
    .from("pending_owner_onboarding")
    .update({
      consumed_at: new Date().toISOString(),
      auth_user_id: userId,
    })
    .eq("id", pendingId)
    .is("consumed_at", null)
    .then(({ error }) => {
      if (error) console.warn("[pendingOwner AuthNet] pending update:", error);
    });

  console.log("[pendingOwner AuthNet] completed:", businessId, email);
  return { ok: true, userId, businessId, email };
}
