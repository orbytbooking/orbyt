import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAuthorizeNetArbSubscription,
  getAuthorizeNetTransactionDetails,
} from "@/lib/platform-billing/authorizeNetPlatformApi";
import {
  recordPlatformPaymentAuthorizeNet,
  syncPlatformSubscriptionAuthorizeNetRow,
} from "@/lib/platform-billing/applyPlatformSubscriptionFromAuthorizeNet";
import { processPendingOwnerAuthorizeNet } from "@/lib/webhooks/processPendingOwnerAuthorizeNet";

function centsFromAuthAmount(authAmount: string): number {
  const n = Number.parseFloat(authAmount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function addBillingInterval(baseYyyyMmDd: string, billing: "monthly" | "yearly"): string {
  const [y, m, d] = baseYyyyMmDd.split("-").map((x) => Number.parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (billing === "yearly") {
    dt.setUTCFullYear(dt.getUTCFullYear() + 1);
  } else {
    dt.setUTCMonth(dt.getUTCMonth() + 1);
  }
  return dt.toISOString().slice(0, 10);
}

export async function completePlatformAuthorizeNetCheckout(params: {
  supabase: SupabaseClient;
  transId: string;
  appOrigin: string;
}): Promise<
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string; httpStatus?: number }
> {
  const { supabase, transId, appOrigin } = params;
  const origin = appOrigin.replace(/\/$/, "");

  let details;
  try {
    details = await getAuthorizeNetTransactionDetails(transId);
  } catch (e) {
    console.error("[Platform Authorize.Net] getTransactionDetails:", e);
    return { ok: false, error: e instanceof Error ? e.message : "transaction_lookup_failed", httpStatus: 502 };
  }

  if (details.responseCode !== "1") {
    return {
      ok: false,
      error: `Payment not approved (response code ${details.responseCode})`,
      httpStatus: 400,
    };
  }

  const token = details.invoiceNumber?.trim();
  if (!token) {
    return { ok: false, error: "Missing invoice reference on transaction", httpStatus: 400 };
  }

  const { data: sessionRow, error: sessErr } = await supabase
    .from("platform_authorize_net_checkout_sessions")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (sessErr || !sessionRow) {
    console.error("[Platform Authorize.Net] checkout session:", token, sessErr);
    return { ok: false, error: "Checkout session not found or expired", httpStatus: 400 };
  }

  const sess = sessionRow as {
    token: string;
    business_id: string | null;
    pending_owner_id: string | null;
    plan_slug: string;
    amount_cents: number;
    billing_interval: "monthly" | "yearly";
    completed_at: string | null;
  };

  if (sess.completed_at) {
    const redirectUrl = sess.pending_owner_id
      ? `${origin}/auth/onboarding/complete?pending_id=${encodeURIComponent(sess.pending_owner_id)}&provider=authorize_net`
      : `${origin}/admin/settings/account?tab=billing&platform_sub=success`;
    return { ok: true, redirectUrl };
  }

  const paidCents = centsFromAuthAmount(details.authAmount);
  if (Math.abs(paidCents - sess.amount_cents) > 2) {
    console.warn(
      "[Platform Authorize.Net] amount mismatch:",
      paidCents,
      "expected",
      sess.amount_cents,
      "trans",
      transId
    );
    return { ok: false, error: "Paid amount does not match selected plan", httpStatus: 400 };
  }

  if (!details.customerProfileId || !details.customerPaymentProfileId) {
    return {
      ok: false,
      error: "Payment profile was not created — enable CIM / customer profiles on your Authorize.Net merchant.",
      httpStatus: 500,
    };
  }

  const paidDate =
    new Date().toISOString().slice(0, 10);
  const arbStart = addBillingInterval(paidDate, sess.billing_interval);
  const amountFormatted = (sess.amount_cents / 100).toFixed(2);

  let arbId: string;
  try {
    arbId = await createAuthorizeNetArbSubscription({
      name: `Orbyt ${sess.plan_slug}`,
      amountFormatted,
      billingInterval: sess.billing_interval,
      startDateYyyyMmDd: arbStart,
      customerProfileId: details.customerProfileId,
      customerPaymentProfileId: details.customerPaymentProfileId,
      invoiceNumber: sess.token,
      description: `Orbyt workspace — ${sess.plan_slug}`,
    });
  } catch (e) {
    console.error("[Platform Authorize.Net] ARB create failed:", e);
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Could not start subscription billing. Support can complete this from the transaction id.",
      httpStatus: 502,
    };
  }

  if (sess.pending_owner_id) {
    const prov = await processPendingOwnerAuthorizeNet({
      supabase,
      pendingId: sess.pending_owner_id,
      customerProfileId: details.customerProfileId,
      paymentProfileId: details.customerPaymentProfileId,
      arbSubscriptionId: arbId,
      planSlug: sess.plan_slug,
      currentPeriodStart: paidDate,
      currentPeriodEnd: arbStart,
    });

    if (!prov.ok) {
      return { ok: false, error: prov.error, httpStatus: 500 };
    }

    const bizId = prov.businessId;
    if (bizId) {
      const payRes = await recordPlatformPaymentAuthorizeNet({
        supabase,
        businessId: bizId,
        planSlug: sess.plan_slug,
        amountCents: paidCents,
        transId: details.transId,
        description: `Initial subscription – ${sess.plan_slug}`,
      });
      if (payRes.error) {
        console.error("[Platform Authorize.Net] platform_payments:", payRes.error);
      }
    }
  } else if (sess.business_id) {
    const syncErr = await syncPlatformSubscriptionAuthorizeNetRow({
      supabase,
      businessId: sess.business_id,
      planSlug: sess.plan_slug,
      customerProfileId: details.customerProfileId,
      paymentProfileId: details.customerPaymentProfileId,
      arbSubscriptionId: arbId,
      currentPeriodStart: paidDate,
      currentPeriodEnd: arbStart,
    });
    if (syncErr.error) {
      return { ok: false, error: syncErr.error, httpStatus: 500 };
    }

    const payRes = await recordPlatformPaymentAuthorizeNet({
      supabase,
      businessId: sess.business_id,
      planSlug: sess.plan_slug,
      amountCents: paidCents,
      transId: details.transId,
      description: `Subscription – ${sess.plan_slug}`,
    });
    if (payRes.error) {
      console.error("[Platform Authorize.Net] platform_payments:", payRes.error);
      return { ok: false, error: payRes.error, httpStatus: 500 };
    }
  } else {
    return { ok: false, error: "Invalid checkout session target", httpStatus: 500 };
  }

  await supabase
    .from("platform_authorize_net_checkout_sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("token", token)
    .is("completed_at", null);

  const redirectUrl = sess.pending_owner_id
    ? `${origin}/auth/onboarding/complete?pending_id=${encodeURIComponent(sess.pending_owner_id)}&provider=authorize_net`
    : `${origin}/admin/settings/account?tab=billing&platform_sub=success`;

  return { ok: true, redirectUrl };
}
