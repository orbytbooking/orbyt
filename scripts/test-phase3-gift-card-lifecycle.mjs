/**
 * Phase 3 — gift card lifecycle smoke test.
 * Run: node scripts/test-phase3-gift-card-lifecycle.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const raw = readFileSync(resolve(root, ".env"), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const pass = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => {
  console.error(`  ✗ ${msg}`);
  process.exit(1);
};
const skip = (msg) => console.log(`  ○ ${msg} (skipped)`);

function deriveProjectRef(url) {
  try {
    return new URL(url).hostname.split(".")[0]?.trim() || null;
  } catch {
    return null;
  }
}

const projectRef = deriveProjectRef(env.NEXT_PUBLIC_SUPABASE_URL);
const TENANT_AUTH_STORAGE_KEY = projectRef
  ? `sb-${projectRef}-auth-token-owner`
  : "sb-orbyt-tenant-auth";

async function getAdminSession() {
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, owner_id")
    .ilike("name", "%DEMO%")
    .limit(1)
    .maybeSingle();
  if (!biz?.owner_id) fail("DEMO business not found");

  const { data: ownerUser } = await supabase.auth.admin.getUserById(biz.owner_id);
  const email = ownerUser?.user?.email;
  if (!email) fail("Owner email not found");

  const jar = new Map();
  const sb = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
    cookieOptions: { name: TENANT_AUTH_STORAGE_KEY, path: "/", sameSite: "lax" },
  });

  const password = process.env.TEST_ADMIN_PASSWORD?.trim();
  if (password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) fail(`Admin sign-in: ${error.message}`);
  } else {
    const { data: link } = await supabase.auth.admin.generateLink({ type: "magiclink", email });
    const { error } = await sb.auth.verifyOtp({
      type: "email",
      email,
      token: link.properties.email_otp,
    });
    if (error) fail(`Admin OTP: ${error.message}`);
  }

  const token = (await sb.auth.getSession()).data.session?.access_token;
  if (!token) fail("No admin session token");
  const cookieHeader = [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; ");

  return { businessId: biz.id, token, cookieHeader, email };
}

async function main() {
  console.log("\nPhase 3 — gift card lifecycle test\n");

  // 1. Migration / RPC
  const { error: rpcProbeErr } = await supabase.rpc("refund_gift_card_for_booking", {
    p_booking_id: "00000000-0000-0000-0000-000000000000",
    p_business_id: "00000000-0000-0000-0000-000000000000",
    p_description: "probe",
  });
  if (rpcProbeErr?.message?.includes("Could not find the function")) {
    fail("Migration 160 not applied — run database/migrations/160_gift_card_lifecycle.sql on Supabase");
  }
  pass("refund_gift_card_for_booking RPC exists");

  const { data: colProbe, error: colErr } = await supabase
    .from("gift_card_instances")
    .select("scheduled_send_at, status")
    .limit(1);
  if (colErr?.message?.includes("scheduled_send_at")) {
    fail("Migration 160 columns missing — run 160_gift_card_lifecycle.sql");
  }
  pass("scheduled_send_at column exists");

  const { businessId, cookieHeader } = await getAdminSession();
  console.log(`Business: ${businessId}\n`);

  const headers = (extra = {}) => ({
    Cookie: cookieHeader,
    "x-business-id": businessId,
    ...extra,
  });

  // 2. Scheduled send via API
  const { data: template } = await supabase
    .from("marketing_gift_cards")
    .select("id, amount, expires_in_months, active")
    .eq("business_id", businessId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (!template?.id) fail("No active gift card template");

  const scheduleAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const testEmail = process.env.TEST_GIFT_EMAIL?.trim() || "phase3-schedule-test@example.com";

  const createRes = await fetch(`${BASE}/api/marketing/gift-cards/instances`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      business_id: businessId,
      gift_card_id: template.id,
      quantity: 1,
      purchaser_email: testEmail,
      purchaser_name: "Phase 3 Test",
      recipient_email: testEmail,
      recipient_name: "Phase 3 Recipient",
      message: "Scheduled send test",
      send_email: true,
      scheduled_send_at: scheduleAt,
    }),
  });
  const createJson = await createRes.json().catch(() => ({}));
  if (!createRes.ok) fail(`Schedule create failed: ${createRes.status} ${JSON.stringify(createJson)}`);
  if (!createJson.scheduled) fail("Expected scheduled:true in create response");

  const instance = createJson.data?.[0];
  if (!instance?.id || instance.status !== "pending_send") {
    fail(`Expected pending_send instance, got ${instance?.status}`);
  }
  pass(`Scheduled instance created (${instance.unique_code}, pending_send)`);

  // Force due for cron
  const past = new Date(Date.now() - 60_000).toISOString();
  const { error: dueErr } = await supabase
    .from("gift_card_instances")
    .update({ scheduled_send_at: past })
    .eq("id", instance.id)
    .eq("business_id", businessId);
  if (dueErr) fail(`Could not set scheduled_send_at: ${dueErr.message}`);
  pass("scheduled_send_at moved to past for cron test");

  const cronSecret = env.CRON_SECRET?.trim();
  const cronHeaders = cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {};
  const cronRes = await fetch(`${BASE}/api/cron/send-scheduled-gift-cards`, {
    method: "POST",
    headers: cronHeaders,
  });
  const cronJson = await cronRes.json().catch(() => ({}));
  if (!cronRes.ok) fail(`Cron failed: ${cronRes.status} ${JSON.stringify(cronJson)}`);

  const sentRow = (cronJson.results || []).find((r) => r.id === instance.id);
  if (!sentRow?.ok) {
    fail(`Cron did not send instance: ${JSON.stringify(cronJson)}`);
  }
  pass(`Cron sent scheduled gift card (processed=${cronJson.processed}, sent=${cronJson.sent})`);

  const { data: afterSend } = await supabase
    .from("gift_card_instances")
    .select("status, email_sent_at, scheduled_send_at")
    .eq("id", instance.id)
    .single();
  if (afterSend?.status !== "active") fail(`After cron expected active, got ${afterSend?.status}`);
  if (!afterSend?.email_sent_at) fail("email_sent_at not set after cron");
  pass("Instance active with email_sent_at after cron");

  // 3. Refund on booking cancel (RPC level)
  const { data: activeCard } = await supabase
    .from("gift_card_instances")
    .select("id, unique_code, current_balance, original_amount, status")
    .eq("business_id", businessId)
    .eq("status", "active")
    .gt("current_balance", 5)
    .limit(1)
    .maybeSingle();
  if (!activeCard?.unique_code) {
    skip("No active card with balance for redemption/refund test");
  } else {
    const redeemAmount = 5;
    const balanceBefore = Number(activeCard.current_balance);

    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", businessId)
      .limit(1)
      .maybeSingle();

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        business_id: businessId,
        customer_id: customer?.id ?? null,
        status: "pending",
        payment_status: "pending",
        total_price: 50,
        address: "Phase 3 test address",
        scheduled_date: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (bookingErr || !booking?.id) fail(`Test booking insert: ${bookingErr?.message}`);

    const { data: redeemData, error: redeemErr } = await supabase.rpc("redeem_gift_card", {
      card_code: activeCard.unique_code,
      business_uuid: businessId,
      redemption_amount: redeemAmount,
      booking_uuid: booking.id,
      customer_uuid: customer?.id ?? null,
      transaction_description: "Phase 3 test redemption",
    });
    if (redeemErr) fail(`redeem_gift_card: ${redeemErr.message}`);
    const redeemRow = Array.isArray(redeemData) ? redeemData[0] : redeemData;
    if (!redeemRow?.success) fail(`redeem failed: ${redeemRow?.error_message}`);

    const { data: afterRedeem } = await supabase
      .from("gift_card_instances")
      .select("current_balance")
      .eq("id", activeCard.id)
      .single();
    const balanceAfterRedeem = Number(afterRedeem?.current_balance);
    if (Math.abs(balanceAfterRedeem - (balanceBefore - redeemAmount)) > 0.01) {
      fail(`Balance after redeem expected ${balanceBefore - redeemAmount}, got ${balanceAfterRedeem}`);
    }
    pass(`Redeemed $${redeemAmount} on test booking`);

    const { data: refundData, error: refundErr } = await supabase.rpc("refund_gift_card_for_booking", {
      p_booking_id: booking.id,
      p_business_id: businessId,
      p_description: "Phase 3 test refund",
    });
    if (refundErr) fail(`refund RPC: ${refundErr.message}`);
    const refund = refundData;
    if (!refund?.success || Number(refund.refunded_count) < 1) {
      fail(`Refund RPC did not restore: ${JSON.stringify(refund)}`);
    }
    pass(`refund_gift_card_for_booking restored $${refund.total_refunded}`);

    const { data: afterRefund } = await supabase
      .from("gift_card_instances")
      .select("current_balance")
      .eq("id", activeCard.id)
      .single();
    if (Math.abs(Number(afterRefund?.current_balance) - balanceBefore) > 0.01) {
      fail(`Balance after refund expected ${balanceBefore}, got ${afterRefund?.current_balance}`);
    }
    pass("Gift card balance restored after refund RPC");

    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
  }

  console.log("\nAll Phase 3 checks passed.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
