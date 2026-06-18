/**
 * Phase 2.4 — allow_gift_cards coupon + gift card combo enforcement.
 * Run: node scripts/test-allow-gift-cards-phase24.mjs
 */
import { createClient } from "@supabase/supabase-js";
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

async function fetchJson(url) {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function main() {
  console.log("\nPhase 2.4 — allow_gift_cards enforcement test\n");

  const businessId =
    process.env.TEST_BUSINESS_ID?.trim() ||
    (
      await supabase.from("businesses").select("id").ilike("name", "%DEMO%").limit(1).maybeSingle()
    ).data?.id;

  if (!businessId) fail("No business found (set TEST_BUSINESS_ID or add a DEMO business)");

  console.log(`Business: ${businessId}`);

  const { data: coupons, error: couponErr } = await supabase
    .from("marketing_coupons")
    .select("code, allow_gift_cards, active")
    .eq("business_id", businessId)
    .eq("active", true);

  if (couponErr) fail(`Coupon query failed: ${couponErr.message}`);

  const blocked = coupons?.find((c) => c.allow_gift_cards !== true);
  const allowed = coupons?.find((c) => c.allow_gift_cards === true);

  if (!blocked) {
    console.log("  (no active coupon with allow_gift_cards=false — skipping blocked-combo API test)");
  }
  if (!allowed) {
    console.log("  (no active coupon with allow_gift_cards=true — skipping allowed-combo API test)");
  }

  const { data: giftRow } = await supabase
    .from("gift_card_instances")
    .select("unique_code, current_balance, status")
    .eq("business_id", businessId)
    .eq("status", "active")
    .gt("current_balance", 0)
    .limit(1)
    .maybeSingle();

  if (!giftRow?.unique_code) fail("No active gift card with balance found for this business");

  const giftCode = giftRow.unique_code;
  console.log(`Gift card: ${giftCode} ($${giftRow.current_balance})\n`);

  // 1. marketing-coupon returns allow_gift_cards
  const sample = blocked || allowed || coupons?.[0];
  if (sample?.code) {
    const { res, json } = await fetchJson(
      `${BASE}/api/guest/marketing-coupon?business_id=${businessId}&code=${encodeURIComponent(sample.code)}`,
    );
    if (!res.ok) fail(`marketing-coupon HTTP ${res.status}`);
    if (json.coupon?.allow_gift_cards === undefined) {
      fail("marketing-coupon response missing allow_gift_cards");
    }
    if (json.coupon.allow_gift_cards !== sample.allow_gift_cards) {
      fail(
        `allow_gift_cards mismatch: API=${json.coupon.allow_gift_cards} DB=${sample.allow_gift_cards}`,
      );
    }
    pass(`GET /api/guest/marketing-coupon returns allow_gift_cards=${json.coupon.allow_gift_cards}`);
  }

  // 2. gift-card without coupon still validates
  {
    const { res, json } = await fetchJson(
      `${BASE}/api/guest/gift-card?business_id=${businessId}&unique_code=${encodeURIComponent(giftCode)}`,
    );
    if (!res.ok || !json.valid) fail(`gift-card alone should validate (HTTP ${res.status})`);
    pass("Gift card validates without coupon_code");
  }

  // 3. blocked combo rejected on guest gift-card API
  if (blocked?.code) {
    const { res, json } = await fetchJson(
      `${BASE}/api/guest/gift-card?business_id=${businessId}&unique_code=${encodeURIComponent(giftCode)}&coupon_code=${encodeURIComponent(blocked.code)}`,
    );
    if (res.status !== 400) fail(`blocked combo expected HTTP 400, got ${res.status}`);
    if (json.valid !== false) fail("blocked combo should return valid:false");
    if (!String(json.error_message || "").includes("cannot be combined")) {
      fail(`unexpected error message: ${json.error_message}`);
    }
    pass(`Blocked combo rejected (coupon ${blocked.code}, allow_gift_cards=false)`);
  }

  // 4. allowed combo passes guest gift-card API
  if (allowed?.code) {
    const { res, json } = await fetchJson(
      `${BASE}/api/guest/gift-card?business_id=${businessId}&unique_code=${encodeURIComponent(giftCode)}&coupon_code=${encodeURIComponent(allowed.code)}`,
    );
    if (!res.ok || !json.valid) {
      fail(`allowed combo should validate (HTTP ${res.status}, ${json.error_message || json.error})`);
    }
    pass(`Allowed combo passes (coupon ${allowed.code}, allow_gift_cards=true)`);
  }

  // 5. server booking validate path (processGiftCardFromBookingBody via guest bookings pre-check)
  if (blocked?.code) {
    const body = {
      business_id: businessId,
      coupon_code: blocked.code,
      gift_card_code: giftCode,
      gift_card_redemption_amount: 1,
      amount: 50,
      paymentMethod: "cash",
      customer_email: "phase24-test@example.com",
      customer_name: "Phase 2.4 Test",
    };
    const res = await fetch(`${BASE}/api/guest/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (res.status !== 400 || json.error !== "INVALID_GIFT_CARD") {
      fail(`guest/bookings blocked combo expected INVALID_GIFT_CARD, got ${res.status} ${JSON.stringify(json)}`);
    }
    if (!String(json.message || "").includes("cannot be combined")) {
      fail(`guest/bookings unexpected message: ${json.message}`);
    }
    pass("POST /api/guest/bookings rejects blocked coupon + gift card server-side");
  }

  console.log("\nAll Phase 2.4 checks passed.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
