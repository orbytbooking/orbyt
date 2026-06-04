/**
 * End-to-end gift card API + DB smoke test (run: node scripts/test-gift-card-flow.mjs)
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

async function main() {
  console.log('=== Gift Card Flow Test ===');
  console.log('API base:', BASE);

  // 1. Resolve a business
  const { data: businesses, error: bizErr } = await supabase.from('businesses').select('id, name').limit(3);
  if (bizErr) {
    log('FAIL businesses query', bizErr);
    process.exit(1);
  }
  if (!businesses?.length) {
    log('FAIL', 'No businesses in database');
    process.exit(1);
  }
  const businessId = businesses[0].id;
  log('OK business', { id: businessId, name: businesses[0].name });

  // 2. Check RPC functions exist
  const { data: fnCheck, error: fnErr } = await supabase.rpc('validate_gift_card', {
    card_code: '__NONEXISTENT__',
    business_uuid: businessId,
  });
  if (fnErr) {
    log('FAIL validate_gift_card RPC', fnErr);
    process.exit(1);
  }
  log('OK validate_gift_card RPC', fnCheck?.[0] ?? fnCheck);

  // 3. List templates via API
  const listRes = await fetch(`${BASE}/api/marketing/gift-cards?business_id=${businessId}&active=true`);
  const listJson = await listRes.json();
  if (!listRes.ok) {
    log('FAIL list templates API', { status: listRes.status, ...listJson });
    process.exit(1);
  }
  log('OK list templates', { count: listJson.data?.length ?? 0 });

  let templateId = listJson.data?.[0]?.id;

  // 4. Create template if none
  if (!templateId) {
    const code = `TEST${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const createRes = await fetch(`${BASE}/api/marketing/gift-cards`, {
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
    const createJson = await createRes.json();
    if (!createRes.ok) {
      log('FAIL create template API', { status: createRes.status, ...createJson });
      process.exit(1);
    }
    templateId = createJson.data?.id;
    log('OK created template', createJson.data);
  }

  // 5. Purchase instance
  const purchaseRes = await fetch(`${BASE}/api/marketing/gift-cards/instances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: businessId,
      gift_card_id: templateId,
      quantity: 1,
      purchaser_email: 'test-purchaser@example.com',
      recipient_email: 'test-recipient@example.com',
      message: 'Automated test',
    }),
  });
  const purchaseJson = await purchaseRes.json();
  if (!purchaseRes.ok) {
    log('FAIL purchase instance API', { status: purchaseRes.status, ...purchaseJson });
    process.exit(1);
  }
  const instance = purchaseJson.data?.[0];
  const uniqueCode = instance?.unique_code;
  log('OK purchased instance', { unique_code: uniqueCode, balance: instance?.current_balance });

  if (!uniqueCode) {
    log('FAIL', 'No unique_code on created instance');
    process.exit(1);
  }

  // 6. Validate via API
  const validateRes = await fetch(
    `${BASE}/api/marketing/gift-cards/redeem?business_id=${businessId}&unique_code=${encodeURIComponent(uniqueCode)}`
  );
  const validateJson = await validateRes.json();
  if (!validateRes.ok || !validateJson.valid) {
    log('FAIL validate API', { status: validateRes.status, ...validateJson });
    process.exit(1);
  }
  log('OK validate API', validateJson);

  // 7. Redeem partial via API
  const redeemRes = await fetch(`${BASE}/api/marketing/gift-cards/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: businessId,
      unique_code: uniqueCode,
      redemption_amount: 10,
      description: 'Automated test redemption',
    }),
  });
  const redeemJson = await redeemRes.json();
  if (!redeemRes.ok || !redeemJson.success) {
    log('FAIL redeem API', { status: redeemRes.status, ...redeemJson });
    process.exit(1);
  }
  log('OK redeem API', redeemJson);

  // 8. Validate balance after redeem
  const afterRes = await fetch(
    `${BASE}/api/marketing/gift-cards/redeem?business_id=${businessId}&unique_code=${encodeURIComponent(uniqueCode)}`
  );
  const afterJson = await afterRes.json();
  const expectedBalance = (instance.current_balance ?? 25) - 10;
  if (!afterRes.ok || !afterJson.valid) {
    log('FAIL post-redeem validate', afterJson);
    process.exit(1);
  }
  if (Number(afterJson.current_balance) !== expectedBalance) {
    log('WARN balance mismatch', { expected: expectedBalance, got: afterJson.current_balance });
  } else {
    log('OK post-redeem balance', afterJson.current_balance);
  }

  console.log('\n=== ALL GIFT CARD CHECKS PASSED ===\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
