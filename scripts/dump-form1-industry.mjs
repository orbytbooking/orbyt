/**
 * Read-only dump of Form 1 config for an industry: full rows + related dependency tables.
 *
 * Includes:
 * - industry_frequency (*)
 * - industry_service_category (*)
 * - industry_pricing_parameter (*)
 * - industry_extras (*)
 * - industry_location (per-industry links: locations ↔ frequencies/categories/variables/extras/excludes)
 * - industry_exclude_parameter (*)
 *
 * Usage (from repo root):
 *   node --env-file=.env scripts/dump-form1-industry.mjs
 *   node --env-file=.env scripts/dump-form1-industry.mjs "Home Cleaning"
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const nameFilter = process.argv[2]?.trim() || process.env.FORM1_INDUSTRY_NAME?.trim() || '';

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function isUuid(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

async function main() {
  const { data: industries, error: indErr } = await supabase
    .from('industries')
    .select('id, name, business_id')
    .order('name');
  if (indErr) {
    console.error('industries:', indErr.message);
    process.exit(1);
  }
  if (!industries?.length) {
    console.log('No industries found.');
    return;
  }

  let industry = null;
  if (nameFilter) {
    industry = industries.find((i) => i.name.toLowerCase().includes(nameFilter.toLowerCase()));
    if (!industry) {
      console.error(`No industry matching "${nameFilter}". Available:`, industries.map((i) => i.name));
      process.exit(1);
    }
  } else {
    industry = industries[0];
    console.error('// No industry name passed; using first alphabetically:', industry.name);
  }

  const industryId = industry.id;
  const businessId = industry.business_id;
  const industryName = industry.name;

  const [
    freqRes,
    catRes,
    priceRes,
    extrasRes,
    locRes,
    excludeRes,
  ] = await Promise.all([
    supabase
      .from('industry_frequency')
      .select('*')
      .eq('industry_id', industryId)
      .order('created_at', { ascending: true }),
    supabase
      .from('industry_service_category')
      .select('*')
      .eq('industry_id', industryId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('industry_pricing_parameter')
      .select('*')
      .eq('industry_id', industryId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('industry_extras')
      .select('*')
      .eq('industry_id', industryId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('industry_location')
      .select('*')
      .eq('industry_id', industryId)
      .order('created_at', { ascending: true }),
    supabase
      .from('industry_exclude_parameter')
      .select('*')
      .eq('industry_id', industryId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ]);

  const results = [
    ['industry_frequency', freqRes],
    ['industry_service_category', catRes],
    ['industry_pricing_parameter', priceRes],
    ['industry_extras', extrasRes],
    ['industry_location', locRes],
    ['industry_exclude_parameter', excludeRes],
  ];
  for (const [label, res] of results) {
    if (res.error) {
      console.error(label, res.error.message);
      process.exit(1);
    }
  }

  const frequencies = freqRes.data || [];
  const idToFreqName = Object.fromEntries(frequencies.map((f) => [f.id, f.name]));
  const idToCatName = Object.fromEntries((catRes.data || []).map((c) => [c.id, c.name]));
  const idToExtraName = Object.fromEntries((extrasRes.data || []).map((e) => [e.id, e.name]));

  const categories = (catRes.data || []).map((c) => {
    const sf = c.selected_frequencies;
    let frequency_labels = sf;
    if (Array.isArray(sf)) {
      frequency_labels = sf.map((x) => (isUuid(String(x)) ? idToFreqName[x] || x : x));
    }
    const ex = c.extras;
    let extra_names = ex;
    if (Array.isArray(ex)) {
      extra_names = ex.map((x) => (isUuid(String(x)) ? idToExtraName[x] || x : x));
    }
    return { ...c, frequency_labels, extra_names };
  });

  const out = {
    _comment:
      'Full columns per table (*). frequency_labels / extra_names are derived for readability. Form 1 also uses locations API; industry_location links locations to subsets of entity ids.',
    industry: { id: industryId, name: industryName, business_id: businessId },
    frequencies,
    service_categories: categories,
    pricing_parameters: priceRes.data || [],
    extras: extrasRes.data || [],
    industry_locations: locRes.data || [],
    exclude_parameters: excludeRes.data || [],
    _resolved_ids: {
      frequency_id_to_name: idToFreqName,
      service_category_id_to_name: idToCatName,
      extra_id_to_name: idToExtraName,
    },
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
