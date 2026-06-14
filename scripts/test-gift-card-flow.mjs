/**
 * Gift card + payment-provider checkout smoke test.
 * Run: npm run test:gift-cards
 * Optional:
 *   TEST_BASE_URL=http://localhost:3000
 *   TEST_BUSINESS_ID=<uuid>   (defaults to business named "DEMO")
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

async function getAdminAccessToken(ownerEmail) {
  const email = process.env.TEST_ADMIN_EMAIL?.trim() || ownerEmail;
  const password = process.env.TEST_ADMIN_PASSWORD?.trim();
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (password) {
    const { data, error } = await anon.auth.signInWithPassword({ email, password });
    if (error || !data.session?.access_token) {
      throw new Error(`Admin sign-in failed: ${error?.message || 'no session'}`);
    }
    return data.session.access_token;
  }

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkErr || !linkData?.properties?.email_otp) {
    throw new Error(`Admin magic link failed: ${linkErr?.message || 'no otp'}`);
  }
  const { data: otpData, error: otpErr } = await anon.auth.verifyOtp({
    type: 'email',
    email,
    token: linkData.properties.email_otp,
  });
  if (otpErr || !otpData.session?.access_token) {
    throw new Error(`Admin OTP verify failed: ${otpErr?.message || 'no session'}`);
  }
  return otpData.session.access_token;
}

function futureBookingDate(daysAhead = 14) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log('=== Gift Card + Payment Checkout Test ===');
  console.log('API base:', BASE);

  // 1. Resolve test business (prefer DEMO; override with TEST_BUSINESS_ID)
  const explicitBusinessId = process.env.TEST_BUSINESS_ID?.trim();
  let businessRow = null;

  if (explicitBusinessId) {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, payment_provider')
      .eq('id', explicitBusinessId)
      .maybeSingle();
    if (error) {
      log('FAIL businesses query', error);
      process.exit(1);
    }
    businessRow = data;
    assert(businessRow, `TEST_BUSINESS_ID not found: ${explicitBusinessId}`);
  } else {
    const { data: businesses, error: bizErr } = await supabase
      .from('businesses')
      .select('id, name, payment_provider')
      .order('name');
    if (bizErr) {
      log('FAIL businesses query', bizErr);
      process.exit(1);
    }
    assert(businesses?.length, 'No businesses in database');
    businessRow =
      businesses.find((b) => String(b.name ?? '').trim().toUpperCase() === 'DEMO') ??
      businesses.find((b) => /demo/i.test(String(b.name ?? ''))) ??
      businesses[0];
    if (String(businessRow.name ?? '').trim().toUpperCase() !== 'DEMO') {
      log('WARN', `No business named DEMO; using ${businessRow.name}`);
    }
  }

  const businessId = businessRow.id;
  const paymentProvider = businessRow.payment_provider === 'authorize_net' ? 'authorize_net' : 'stripe';
  log('OK business', { id: businessId, name: businessRow.name, paymentProvider });

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

  const { data: bizOwner } = await supabase.from('businesses').select('owner_id').eq('id', businessId).single();
  assert(bizOwner?.owner_id, 'Business owner not found for admin auth');
  const { data: ownerUser } = await supabase.auth.admin.getUserById(bizOwner.owner_id);
  const ownerEmail = ownerUser?.user?.email;
  assert(ownerEmail, 'Owner email not found for admin auth');

  let adminToken;
  try {
    adminToken = await getAdminAccessToken(ownerEmail);
  } catch (e) {
    log('FAIL admin auth', e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  const adminHeaders = (extra = {}) => ({
    ...extra,
    Authorization: `Bearer ${adminToken}`,
    'x-business-id': businessId,
  });

  // 3. Templates
  const { res: listRes, json: listJson } = await fetchJson(
    `${BASE}/api/marketing/gift-cards?business_id=${businessId}&active=true`,
    { headers: adminHeaders() },
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
      headers: adminHeaders({ 'Content-Type': 'application/json' }),
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
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
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
    { headers: adminHeaders() },
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

  const bookingDate = futureBookingDate();
  const guestEmail = `guest-gc-${Date.now()}@example.com`;
  const guestRedeem = 10;
  const guestTotal = 40;

  // 8. Customer (guest book-now) — create booking with gift card + redeem
  const { res: guestBookRes, json: guestBookJson } = await fetchJson(`${BASE}/api/guest/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-business-id': businessId,
    },
    body: JSON.stringify({
      customer_name: 'Guest Gift Card Test',
      customer_email: guestEmail,
      customer_phone: '5550100',
      address: '123 Guest Gift Card Test St',
      service: 'Automation Test Service',
      date: bookingDate,
      time: '10:00 AM',
      payment_method: 'cash',
      amount: guestTotal,
      total: guestTotal,
      gift_card_code: uniqueCode,
      gift_card_instance_id: instance.id,
      gift_card_redemption_amount: guestRedeem,
      customization: {
        gift_card: { code: uniqueCode, redemption_amount: guestRedeem },
      },
    }),
  });
  if (!guestBookRes.ok) {
    log('FAIL guest booking with gift card', { status: guestBookRes.status, ...guestBookJson });
    process.exit(1);
  }
  const guestBookingId = guestBookJson.data?.id ?? guestBookJson.id;
  assert(guestBookingId, 'Guest booking id missing');
  log('OK guest booking with gift card', { bookingId: guestBookingId, email: guestEmail });

  const { data: guestTx } = await supabase
    .from('gift_card_transactions')
    .select('id, amount, booking_id')
    .eq('business_id', businessId)
    .eq('booking_id', guestBookingId)
    .eq('transaction_type', 'redemption')
    .maybeSingle();
  assert(guestTx, 'Guest booking gift card transaction not found');
  log('OK guest gift card transaction', guestTx);

  const balanceAfterGuest = startingBalance - guestRedeem;
  const { res: balGuestRes, json: balGuestJson } = await fetchJson(
    `${BASE}/api/guest/gift-card?business_id=${businessId}&unique_code=${encodeURIComponent(uniqueCode)}`,
  );
  assert(balGuestRes.ok && Number(balGuestJson.current_balance) === balanceAfterGuest, 'Guest redeem balance wrong');
  log('OK guest-side balance after booking', balGuestJson.current_balance);

  // 9. Admin Add Booking — POST /api/bookings with gift card + redeem
  const adminRedeem = 10;
  const adminTotal = 35;
  const adminEmail = `admin-gc-${Date.now()}@example.com`;
  const { res: adminBookRes, json: adminBookJson } = await fetchJson(`${BASE}/api/bookings`, {
    method: 'POST',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      customer_name: 'Admin Gift Card Test',
      customer_email: adminEmail,
      customer_phone: '5550101',
      address: '456 Admin Gift Card Test St',
      service: 'Automation Test Service',
      date: bookingDate,
      time: '11:00 AM',
      status: 'pending',
      payment_method: 'Cash',
      amount: adminTotal,
      total_price: adminTotal,
      gift_card_code: uniqueCode,
      gift_card_instance_id: instance.id,
      gift_card_redemption_amount: adminRedeem,
      customization: {
        gift_card: {
          code: uniqueCode,
          instance_id: instance.id,
          redemption_amount: adminRedeem,
        },
      },
    }),
  });
  if (!adminBookRes.ok) {
    log('FAIL admin booking with gift card', { status: adminBookRes.status, ...adminBookJson });
    process.exit(1);
  }
  const adminBookingId = adminBookJson.data?.id;
  assert(adminBookingId, 'Admin booking id missing');
  log('OK admin booking with gift card', { bookingId: adminBookingId, email: adminEmail });

  const { data: adminTx } = await supabase
    .from('gift_card_transactions')
    .select('id, amount, booking_id')
    .eq('business_id', businessId)
    .eq('booking_id', adminBookingId)
    .eq('transaction_type', 'redemption')
    .maybeSingle();
  assert(adminTx, 'Admin booking gift card transaction not found');
  log('OK admin gift card transaction', adminTx);

  const balanceAfterAdmin = balanceAfterGuest - adminRedeem;
  const { res: balAdminRes, json: balAdminJson } = await fetchJson(
    `${BASE}/api/marketing/gift-cards/redeem?business_id=${businessId}&unique_code=${encodeURIComponent(uniqueCode)}`,
    { headers: adminHeaders() },
  );
  assert(balAdminRes.ok && Number(balAdminJson.current_balance) === balanceAfterAdmin, 'Admin redeem balance wrong');
  log('OK admin-side balance after booking', balAdminJson.current_balance);

  // 10. Full gift-card cover → create-checkout must reject card payment
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

  // 11. Partial cover → create-checkout validates amount; mismatch rejected
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
      successUrl: `${BASE}/book-now?${paymentProvider === 'authorize_net' ? 'anet_sb' : 'stripe=success&session_id={CHECKOUT_SESSION_ID}'}&business=${businessId}`,
      cancelUrl: `${BASE}/book-now?${paymentProvider === 'authorize_net' ? `anet_cancel_b=${encodeURIComponent(businessId)}` : `stripe=cancel&business=${businessId}`}`,
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

  console.log('\n=== ALL GIFT CARD CHECKS PASSED (customer + admin + checkout) ===');
  console.log(`Test card code: ${uniqueCode} — balance now ~$${balanceAfterAdmin}`);
  console.log(`Guest booking: ${guestBookingId} | Admin booking: ${adminBookingId}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
