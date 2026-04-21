/**
 * Read-only Supabase check: connectivity + a few core tables.
 * Run from repo root: node --env-file=.env scripts/check-database.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tables = [
  'businesses',
  'profiles',
  'tenant_users',
  'bookings',
  'customers',
  'providers',
];

console.log('Supabase URL host:', new URL(url).hostname);
console.log('---');

let failed = false;

for (const table of tables) {
  const { error, count } = await supabase.from(table).select('*', {
    count: 'exact',
    head: true,
  });
  if (error) {
    failed = true;
    console.log(`${table}: ERROR — ${error.message} (code ${error.code ?? 'n/a'})`);
  } else {
    console.log(`${table}: OK — estimated rows: ${count ?? 'unknown'}`);
  }
}

console.log('---');
process.exit(failed ? 2 : 0);
