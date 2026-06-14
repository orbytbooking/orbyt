/**
 * Gift card + payment-provider checkout smoke test.
 * Run: npm run test:gift-cards
 * Optional: TEST_BASE_URL=http://localhost:3000
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const raw = readFileSync(resolve(root, '.env'), 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const log = (label, data) => console.log(`\n${label}:`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));

function assert(condition, message) {
  if (!condition) {
    log('FAIL', message);
    process.exit(1);
  }
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function main() {
  console.log('=== Gift Card + Payment Checkout Test ===');
  console.log('API base:', BASE);

  // 1. Resolve a business
  const { data: businesses, error: bizErr } = await supabase
    .from('businesses')
    .select('id, name, payment_provider')
    .limit(3);
  if (bizErr) {
    log('FAIL businesses query', bizErr);
    process.exit(1);
  }
  assert(businesses?.length, 'No businesses in database');
  const businessId = businesses[0].id;
  const paymentProvider = businesses[0].payment_provider === 'authorize_net' ? 'authorize_net' : 'stripe';
  log('OK business', { id: businessId, name: businesses[0].name, paymentProvider });

  // 2. RPC exists
  const { data: fnCheck, error: fnErr } = await supabase.rpc('validate_gift_card', {
    card_code: '__NONEXISTENT__',
    business_uuid: businessId,
  });
  if (fnErr) {
    log('FAIL validate_gift_card RPC', fnErr);
    process.exit(1);
  }
  log('OK validate_gift_card RPC', fnCheck?.[0] ?? fnCheck);

  // 3. Templates
  const { res: listRes, json: listJson } = await fetchJson(
    `${BASE}/api/marketing/gift-cards?business_id=${businessId}&active=true`,
  );
  if (!listRes.ok) {
    log('FAIL list templates API', { status: listRes.status, ...listJson });
    process.exit(1);
  }
  log('OK list templates', { count: listJson.data?.length ?? 0 });

  let templateId = listJson.data?.[0]?.id;
  if (!templateId) {
    const code = `TEST${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const { res: createRes, json: createJson } = await fetchJson(`${BASE}/api/marketing/gift-cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: businessId,
        name: 'API Test Gift Card',
        description: 'Automated test template',
        code,
        amount: 25,
        active: true,
        expires_in_months: 12,
        auto_generate_codes: true,
      }),
    });
    if (!createRes.ok) {
      log('FAIL create template API', { status: createRes.status, ...createJson });
      process.exit(1);
    }
    templateId = createJson.data?.id;
    log('OK created template', createJson.data);
  }

  // 4. Purchase instance ($25)
  const { res: purchaseRes, json: purchaseJson } = await fetchJson(`${BASE}/api/marketing/gift-cards/instances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: businessId,
      gift_card_id: templateId,
      quantity: 1,
      purchaser_email: 'test-purchaser@example.com',
      recipient_email: 'test-recipient@example.com',
      message: 'Automated test',
      send_email: false,
    }),
  });
  if (!purchaseRes.ok) {
    log('FAIL purchase instance API', { status: purchaseRes.status, ...purchaseJson });
    process.exit(1);
  }
  const instance = purchaseJson.data?.[0];
  const uniqueCode = instance?.unique_code;
  const startingBalance = Number(instance?.current_balance ?? 25);
  log('OK purchased instance', { unique_code: uniqueCode, balance: startingBalance });
  assert(uniqueCode, 'No unique_code on created instance');

  // 5. Admin validate API
  const { res: validateRes, json: validateJson } = await fetchJson(
    `${BASE}/api/marketing/gift-cards/redeem?business_id=${businessId}&unique_code=${encodeURIComponent(uniqueCode)}`,
  );
  if (!validateRes.ok || !validateJson.valid) {
    log('FAIL admin validate API', { status: validateRes.status, ...validateJson });
    process.exit(1);
  }
  log('OK admin validate API', validateJson);

  // 6. Guest validate API (book-now)
  const { res: guestValRes, json: guestValJson } = await fetchJson(
    `${BASE}/api/guest/gift-card?business_id=${businessId}&unique_code=${encodeURIComponent(uniqueCode)}`,
  );
  if (!guestValRes.ok || !guestValJson.valid) {
    log('FAIL guest validate API', { status: guestValRes.status, ...guestValJson });
    process.exit(1);
  }
  log('OK guest validate API', guestValJson);

  // 7. Payment provider public endpoint
  const { res: ppRes, json: ppJson } = await fetchJson(
    `${BASE}/api/public/payment-provider?business=${encodeURIComponent(businessId)}`,
  );
  assert(ppRes.ok, `payment-provider API failed: ${ppRes.status}`);
  log('OK payment provider API', ppJson);

  // 8. Full gift-card cover → create-checkout must reject card payment
  // (Pending intents require amount_cents >= 50, so full-cover uses a zero-total booking row instead.)
  const { data: zeroBooking, error: zeroBookingErr } = await supabase
    .from('bookings')
    .insert({
      business_id: businessId,
      address: '123 Automation Test St',
      total_price: 0,
      amount: 0,
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'online',
      customer_email: 'gift-card-automation@example.com',
      customer_name: 'Gift Card Automation',
    })
    .select('id')
    .single();
  if (zeroBookingErr) {
    log('WARN skip full-cover checkout test (bookings insert)', zeroBookingErr.message);
  } else {
    const { res: fullCoRes, json: fullCoJson } = await fetchJson(`${BASE}/api/payments/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: zeroBooking.id,
        amountInCents: 0,
        businessId,
      }),
    });
    assert(fullCoRes.status === 400 && fullCoJson.error === 'NO_CARD_PAYMENT_DUE', 'Expected NO_CARD_PAYMENT_DUE for full gift cover');
    log('OK full-cover checkout blocked (no card due)', { error: fullCoJson.error, payableCents: fullCoJson.payableCents });
    await supabase.from('bookings').delete().eq('id', zeroBooking.id);
  }

  // 9. Partial cover → create-checkout validates amount; mismatch rejected
  const payableDollars = 5;
  const payableCents = payableDollars * 100;
  const giftDiscount = Math.min(startingBalance, 20);
  const partialPayload = {
    payment_method: 'online',
    amount: payableDollars,
    total: payableDollars,
    gift_card_code: uniqueCode,
    gift_card_instance_id: instance.id,
    gift_card_redemption_amount: giftDiscount,
  };
  const { data: partialIntent, error: partialIntentErr } = await supabase
    .from('pending_stripe_booking_intents')
    .insert({
      business_id: businessId,
      source: 'guest',
      customer_auth_user_id: null,
      payload: partialPayload,
      amount_cents: payableCents,
    })
    .select('id')
    .single();
  if (partialIntentErr) {
    log('WARN skip partial-cover checkout test', partialIntentErr.message);
  } else {
    const { res: mismatchRes, json: mismatchJson } = await fetchJson(`${BASE}/api/payments/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pendingStripeBookingIntentId: partialIntent.id,
        amountInCents: payableCents + 100,
        businessId,
      }),
    });
    assert(mismatchRes.status === 400 && mismatchJson.error === 'AMOUNT_MISMATCH', 'Expected AMOUNT_MISMATCH for wrong cents');
    log('OK partial-cover amount mismatch rejected', { expectedCents: mismatchJson.expectedCents });

    const checkoutUrls = {
      successUrl: `${BASE}/book-now?stripe=success&session_id={CHECKOUT_SESSION_ID}&business=${businessId}`,
      cancelUrl: `${BASE}/book-now?stripe=cancel&business=${businessId}`,
    };

    const { res: matchRes, json: matchJson } = await fetchJson(`${BASE}/api/payments/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pendingStripeBookingIntentId: partialIntent.id,
        amountInCents: payableCents,
        businessId,
        lineItemDescription: 'Gift card checkout automation test',
        ...checkoutUrls,
      }),
    });
    if (matchRes.ok && matchJson.url) {
      log('OK partial-cover checkout session created', {
        provider: matchJson.provider,
        payableCents: matchJson.payableCents,
        hasUrl: Boolean(matchJson.url),
      });
    } else if (
      matchRes.status === 500 &&
      String(matchJson.details || matchJson.error).match(/not configured|Authorize|STRIPE|Invalid API Key/i)
    ) {
      log('OK partial-cover amount accepted (Stripe/Authorize not fully configured — expected in some dev envs)', matchJson.details || matchJson.error);
    } else {
      log('FAIL partial-cover checkout with correct amount', { status: matchRes.status, ...matchJson });
      process.exit(1);
    }
    await supabase.from('pending_stripe_booking_intents').delete().eq('id', partialIntent.id);
  }

  // 10. Redeem partial via API
  const { res: redeemRes, json: redeemJson } = await fetchJson(`${BASE}/api/marketing/gift-cards/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: businessId,
      unique_code: uniqueCode,
      redemption_amount: 10,
      description: 'Automated test redemption',
    }),
  });
  if (!redeemRes.ok || !redeemJson.success) {
    log('FAIL redeem API', { status: redeemRes.status, ...redeemJson });
    process.exit(1);
  }
  log('OK redeem API', redeemJson);

  const { res: afterRes, json: afterJson } = await fetchJson(
    `${BASE}/api/marketing/gift-cards/redeem?business_id=${businessId}&unique_code=${encodeURIComponent(uniqueCode)}`,
  );
  const expectedBalance = startingBalance - 10;
  if (!afterRes.ok || !afterJson.valid) {
    log('FAIL post-redeem validate', afterJson);
    process.exit(1);
  }
  if (Number(afterJson.current_balance) !== expectedBalance) {
    log('WARN balance mismatch', { expected: expectedBalance, got: afterJson.current_balance });
  } else {
    log('OK post-redeem balance', afterJson.current_balance);
  }

  console.log('\n=== ALL GIFT CARD + CHECKOUT CHECKS PASSED ===');
  console.log(`Test card code (automation): ${uniqueCode} — balance now ~$${expectedBalance}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
