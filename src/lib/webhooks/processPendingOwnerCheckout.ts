import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  PLATFORM_SUBSCRIPTION_KIND,
  PLATFORM_PENDING_OWNER_KIND,
} from "@/lib/platform-billing/stripePlatformSubscription";
import { syncPlatformSubscriptionRow } from "@/lib/platform-billing/applyPlatformSubscriptionFromStripe";
import { decryptPendingOwnerPassword } from "@/lib/pendingOwnerCrypto";

export type PendingOwnerPayload = {
  fullName: string;
  phone: string;
  businessName: string;
  businessAddress: string | null;
  businessCategory: string;
  plan: string;
};

function sanitizeOwnerEmail(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\u200b-\u200d\ufeff]/g, "");
}

async function findUserIdByEmail(
  admin: SupabaseClient,
  email: string
): Promise<string | null> {
  const target = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;
  for (let i = 0; i < 50; i++) {
    const { data } = await admin.auth.admin.listUsers({ page, per_page: perPage });
    const u = data?.users?.find((x) => x.email?.toLowerCase() === target);
    if (u?.id) return u.id;
    const users = data?.users ?? [];
    if (users.length < perPage) break;
    page++;
  }
  return null;
}

/**
 * After Stripe Checkout completes for a pending owner: create auth user, business, profile,
 * platform_subscriptions row, then align Stripe subscription metadata + sync rows.
 * Idempotent via pending_owner_onboarding.consumed_at.
 */
export async function processPendingOwnerCheckout(params: {
  supabase: SupabaseClient;
  stripe: Stripe;
  session: Stripe.Checkout.Session;
}): Promise<
  | { ok: true; skipped?: boolean; userId?: string; businessId?: string; email?: string }
  | { ok: false; error: string }
> {
  const { supabase, stripe, session } = params;

  if (session.mode !== "subscription") {
    return { ok: false, error: "not_subscription_checkout" };
  }

  // Stripe sometimes omits custom metadata on session retrieve; client_reference_id is set to the same UUID.
  const pendingId =
    session.metadata?.pending_id?.trim() ||
    (typeof session.client_reference_id === "string" ? session.client_reference_id.trim() : "") ||
    "";

  const metaKind = session.metadata?.kind;
  const kindMatches =
    !metaKind || metaKind === PLATFORM_PENDING_OWNER_KIND;

  if (!pendingId) {
    return { ok: false, error: "missing_pending_id" };
  }

  if (!kindMatches) {
    return { ok: false, error: "not_pending_owner_checkout" };
  }

  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;

  if (!subId || !customerId) {
    return { ok: false, error: "missing_subscription_or_customer" };
  }

  const { data: pendingRow, error: pendingErr } = await supabase
    .from("pending_owner_onboarding")
    .select("id, email, password_encrypted, payload, consumed_at, auth_user_id")
    .eq("id", pendingId)
    .maybeSingle();

  if (pendingErr || !pendingRow) {
    console.error("[pendingOwner] pending row not found:", pendingId, pendingErr);
    return { ok: false, error: "pending_not_found" };
  }

  const consumed = (pendingRow as { consumed_at?: string | null }).consumed_at;
  if (consumed) {
    console.log("[pendingOwner] already processed:", pendingId);
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
    console.error("[pendingOwner] decrypt failed:", e);
    return { ok: false, error: "decrypt_failed" };
  }

  const payload = (pendingRow as { payload: PendingOwnerPayload }).payload;
  const planSlug = (payload.plan ?? "starter").toString().toLowerCase().trim();

  let userId: string | null = null;

  // Insert with email/password only so auth.users triggers don't see role/metadata on INSERT.
  // Some projects have triggers that mis-handle owner metadata on first insert; we set metadata after.
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password: passwordPlain,
    email_confirm: true,
  });

  if (createErr) {
    const msg = createErr.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      userId = await findUserIdByEmail(supabase, email);
      if (!userId) {
        console.error("[pendingOwner] duplicate email but user not found:", createErr);
        return { ok: false, error: "create_user_failed" };
      }
      console.warn("[pendingOwner] user already exists, linking:", userId);
      await supabase.auth.admin
        .updateUserById(userId, {
          user_metadata: {
            full_name: payload.fullName,
            role: "owner",
            phone: payload.phone || "",
          },
        })
        .catch((e) => console.warn("[pendingOwner] updateUser metadata:", e));
    } else {
      console.error("[pendingOwner] createUser:", createErr);
      const hint =
        msg.includes("database error checking email") || msg.includes("unexpected_failure")
          ? " Often: orphan rows in auth.identities (see Auth logs + database/diagnose_auth_identities.sql). docs/TROUBLESHOOTING_AUTH_CREATE_USER.md"
          : "";
      return { ok: false, error: `${createErr.message}${hint}` };
    }
  } else if (created?.user?.id) {
    userId = created.user.id;
    const { error: metaErr } = await supabase.auth.admin.updateUserById(created.user.id, {
      user_metadata: {
        full_name: payload.fullName,
        role: "owner",
        phone: payload.phone || "",
      },
    });
    if (metaErr) {
      console.warn("[pendingOwner] updateUser metadata (continuing):", metaErr);
    }
  }

  if (!userId) {
    return { ok: false, error: "no_user_id" };
  }

  let businessId: string;
  const { data: existingBySub } = await supabase
    .from("platform_subscriptions")
    .select("business_id")
    .eq("stripe_subscription_id", subId)
    .maybeSingle();
  if (existingBySub?.business_id) {
    // Idempotent retry path: same Stripe subscription already linked.
    businessId = (existingBySub as { business_id: string }).business_id;
    console.log("[pendingOwner] reusing existing business from stripe_subscription_id:", businessId);
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
      console.log("[pendingOwner] reusing existing business for owner:", businessId);
    } else {
      const { data: business, error: bizErr } = await supabase
        .from("businesses")
        .insert({
          name: payload.businessName,
          address: payload.businessAddress ?? null,
          category: payload.businessCategory,
          owner_id: userId,
          plan: planSlug,
          is_active: false,
        })
        .select("id")
        .single();

      if (bizErr || !business) {
        console.error("[pendingOwner] business insert:", bizErr);
        return { ok: false, error: bizErr?.message ?? "business_insert_failed" };
      }
      businessId = (business as { id: string }).id;
    }
  }

  const { error: profErr } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: payload.fullName,
      phone: payload.phone || "",
      role: "owner",
      business_id: businessId,
      is_active: true,
    },
    { onConflict: "id" }
  );

  if (profErr) {
    console.warn("[pendingOwner] profile upsert (continuing):", profErr);
  }

  const { data: planRow, error: planErr } = await supabase
    .from("platform_subscription_plans")
    .select("id")
    .eq("slug", planSlug)
    .maybeSingle();

  if (planErr || !planRow) {
    console.error("[pendingOwner] plan not found:", planSlug, planErr);
    return { ok: false, error: "plan_not_found" };
  }

  const planId = (planRow as { id: string }).id;
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startStr = periodStart.toISOString().split("T")[0];
  const endStr = periodEnd.toISOString().split("T")[0];

  const { error: subInsErr } = await supabase.from("platform_subscriptions").upsert(
    {
      business_id: businessId,
      plan_id: planId,
      status: "trialing",
      current_period_start: startStr,
      current_period_end: endStr,
      stripe_customer_id: customerId,
      stripe_subscription_id: subId,
    },
    { onConflict: "business_id" }
  );

  if (subInsErr) {
    if (subInsErr.code === "23505") {
      const { data: linked } = await supabase
        .from("platform_subscriptions")
        .select("business_id")
        .eq("stripe_subscription_id", subId)
        .maybeSingle();
      if (linked?.business_id) {
        console.warn(
          "[pendingOwner] stripe_subscription_id already linked; continuing with existing link:",
          (linked as { business_id: string }).business_id
        );
      } else {
        console.error("[pendingOwner] platform_subscriptions upsert:", subInsErr);
        return { ok: false, error: subInsErr.message };
      }
    } else {
    console.error("[pendingOwner] platform_subscriptions upsert:", subInsErr);
    return { ok: false, error: subInsErr.message };
    }
  }

  try {
    await stripe.subscriptions.update(subId, {
      metadata: {
        kind: PLATFORM_SUBSCRIPTION_KIND,
        business_id: businessId,
        plan_slug: planSlug,
      },
    });
  } catch (e) {
    console.error("[pendingOwner] subscription metadata update:", e);
  }

  const subscription = await stripe.subscriptions.retrieve(subId);
  const syncErr = await syncPlatformSubscriptionRow({
    supabase,
    businessId,
    planSlug,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subId,
    subscription,
  });

  if (syncErr.error) {
    console.error("[pendingOwner] syncPlatformSubscriptionRow:", syncErr.error);
    return { ok: false, error: syncErr.error };
  }

  const { error: pendUpErr } = await supabase
    .from("pending_owner_onboarding")
    .update({
      consumed_at: new Date().toISOString(),
      stripe_checkout_session_id: session.id,
      auth_user_id: userId,
    })
    .eq("id", pendingId)
    .is("consumed_at", null);

  if (pendUpErr) {
    console.warn("[pendingOwner] pending row update:", pendUpErr);
  }

  console.log("[pendingOwner] completed:", businessId, email);
  return { ok: true, userId, businessId, email };
}
