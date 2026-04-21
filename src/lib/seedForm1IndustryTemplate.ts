import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeFrequencyPopupDisplay } from '@/lib/frequencyPopupDisplay';
import {
  FORM1_DEFAULT_ALL_FREQUENCY_NAMES,
  FORM1_SEEDED_SERVICE_CATEGORIES,
  type Form1ServiceCategoryKey,
} from '@/lib/form1DefaultServiceCategoryConfig';

/**
 * Starter Form 1 template (cleaning-style) inserted when `seed_form1_template` is true on industry create.
 * All generated configuration is persisted on normal industry_* / location rows with this `business_id` and
 * `industry_id` (fully editable in admin). Tenant default for whether to seed is `businesses.default_seed_form1_template`
 * when the client omits `seed_form1_template` on POST /api/industries.
 *
 * Creates: industry_pricing_variable (3) → industry_service_category (6) → industry_frequency (7) →
 * industry_pricing_parameter (11 Sq Ft + 7 Bedroom + 12 Full/Half bathroom rows; Sq Ft/Bedroom + bath rows set service_category + frequency deps for admin) → industry_extras (9) →
 * industry_exclude_parameter (5 room-style partial-cleaning rows; qty-based, service + frequency scoping) → updates categories (extras + selected_exclude_parameters) →
 * frequency.extras from FREQUENCY_EXTRAS_BY_NAME → industry_location (one row per existing business location).
 *
 * Does not create locations or zip rows; if there are no locations yet, industry_location is skipped (add locations
 * in Form 1 later). Pricing tier $ / minutes are placeholders—edit in admin.
 */
const POPUP = normalizeFrequencyPopupDisplay('customer_frontend_backend_admin');

const VARIABLES_BY_CATEGORY: Record<string, string[]> = {
  'Sq Ft': [
    '1 - 1249 Sq Ft',
    '1250 - 1499 Sq Ft',
    '1500 - 1799 Sq Ft',
    '1800 - 2099 Sq Ft',
    '2100 - 2399 Sq Ft',
    '2400 - 2699 Sq Ft',
    '2700 - 3000 Sq Ft',
    '3000 - 3299 Sq Ft',
    '3300 - 3699 Sq Ft',
    '3700 - 3999',
    '4000+',
  ],
  Bedroom: ['Studio', '1 Bedroom', '2 Bedrooms', '3 Bedrooms', '4 Bedrooms', '5 Bedrooms', '6 Bedrooms'],
  Bathroom: ['Full Bathroom', 'Half Bathroom'],
};

/** Full / Half bathroom line pricing + minutes by service category name (matches common admin defaults). */
const FORM1_BATHROOM_PRICING_BY_SERVICE_NAME: Record<
  string,
  { full: { price: number; time: number }; half: { price: number; time: number } }
> = {
  'Basic Cleaning': { full: { price: 25, time: 30 }, half: { price: 15, time: 15 } },
  'Deep Clean': { full: { price: 35, time: 45 }, half: { price: 20, time: 25 } },
  'Move In/Out Clean': { full: { price: 45, time: 60 }, half: { price: 25, time: 35 } },
  'Construction Clean Up': { full: { price: 48, time: 62 }, half: { price: 27, time: 36 } },
  'Hourly Deep Clean': { full: { price: 35, time: 45 }, half: { price: 20, time: 25 } },
  'Hourly Basic Clean': { full: { price: 25, time: 30 }, half: { price: 15, time: 15 } },
};

const FORM1_BATHROOM_BEDROOM_DEPENDENCY = [
  'Studio',
  '1 Bedroom',
  '2 Bedrooms',
  '3 Bedrooms',
  '4 Bedrooms',
  '5 Bedrooms',
  '6 Bedrooms',
].join(', ');

type CatKey = Form1ServiceCategoryKey;

const SERVICE_CATEGORY_DEFS = FORM1_SEEDED_SERVICE_CATEGORIES.map((row) => ({
  ...row,
  selected_frequencies: [...row.selected_frequencies],
}));

/** Shown in admin “Service Category” / used for filtering — all Form 1 services (tiers apply to each). */
const FORM1_ALL_SERVICE_CATEGORY_NAMES_CSV = SERVICE_CATEGORY_DEFS.map((d) => d.name).join(', ');
/** Shown in admin “Frequency” / used for filtering — union of default frequency names. */
const FORM1_ALL_FREQUENCY_NAMES_CSV = [...FORM1_DEFAULT_ALL_FREQUENCY_NAMES].join(', ');

const SQFT_PRICE_TIME: Array<{ name: string; price: number; time: number; description: string }> =
  VARIABLES_BY_CATEGORY['Sq Ft'].map((name, i) => ({
    name,
    price: 89 + i * 22,
    time: 60 + i * 15,
    description: `${name} home size tier.`,
  }));

const BEDROOM_ROWS: Array<{ name: string; price: number; time: number; description: string }> = [
  { name: 'Studio', price: 10, time: 10, description: 'Studio layout.' },
  { name: '1 Bedroom', price: 12, time: 10, description: 'One bedroom home.' },
  { name: '2 Bedrooms', price: 24, time: 20, description: 'Two bedroom home.' },
  { name: '3 Bedrooms', price: 36, time: 30, description: 'Three bedroom home.' },
  { name: '4 Bedrooms', price: 48, time: 40, description: 'Four bedroom home.' },
  { name: '5 Bedrooms', price: 60, time: 50, description: 'Five bedroom home.' },
  { name: '6 Bedrooms', price: 72, time: 60, description: 'Six bedroom home.' },
];

/**
 * Explicit defaults for every writable `industry_pricing_parameter` field used by Form 1.
 * Optional `dependencyOverrides` sets service category / secondary bedroom dependency (Full & Half bath rows).
 */
function buildPricingParameterInsertRow(args: {
  business_id: string;
  industry_id: string;
  name: string;
  description: string;
  variable_category: string;
  pricing_variable_id: string | null;
  price: number;
  time_minutes: number;
  sort_order: number;
  is_default: boolean;
  dependencyOverrides?: {
    show_based_on_frequency?: boolean;
    show_based_on_service_category?: boolean;
    show_based_on_service_category2?: boolean;
    service_category?: string | null;
    service_category2?: string | null;
    frequency?: string | null;
  };
}): Record<string, unknown> {
  const d = args.dependencyOverrides ?? {};
  return {
    business_id: args.business_id,
    industry_id: args.industry_id,
    name: args.name,
    description: args.description,
    variable_category: args.variable_category,
    pricing_variable_id: args.pricing_variable_id,
    price: args.price,
    time_minutes: args.time_minutes,
    display: 'Customer Frontend, Backend & Admin',
    is_default: args.is_default,
    sort_order: args.sort_order,
    show_based_on_frequency: d.show_based_on_frequency ?? false,
    show_based_on_service_category: d.show_based_on_service_category ?? false,
    show_based_on_service_category2: d.show_based_on_service_category2 ?? false,
    service_category: d.service_category ?? null,
    service_category2: d.service_category2 ?? null,
    frequency: d.frequency ?? null,
    excluded_extras: [],
    excluded_services: [],
    excluded_providers: [],
    exclude_parameters: [],
  };
}

/**
 * Explicit defaults for every writable `industry_exclude_parameter` field used by Form 1.
 * When show_based_on_service_category / show_based_on_frequency are false, service_category and frequency are stored as null.
 */
function buildExcludeParameterInsertRow(args: {
  business_id: string;
  industry_id: string;
  name: string;
  description: string;
  /** Preset key from `INDUSTRY_FORM_ICON_PRESETS` (`value` field), e.g. `bedroom`, `bathroom`. */
  icon: string;
  price: number;
  time_minutes: number;
  sort_order: number;
  qty_based: boolean;
  show_based_on_service_category: boolean;
  show_based_on_frequency: boolean;
  service_category: string | null;
  frequency: string | null;
}): Record<string, unknown> {
  const sc = args.show_based_on_service_category && args.service_category?.trim() ? args.service_category.trim() : null;
  const fq = args.show_based_on_frequency && args.frequency?.trim() ? args.frequency.trim() : null;
  return {
    business_id: args.business_id,
    industry_id: args.industry_id,
    name: args.name,
    description: args.description,
    icon: args.icon,
    price: args.price,
    time_minutes: args.time_minutes,
    display: 'Customer Frontend, Backend & Admin',
    show_based_on_frequency: args.show_based_on_frequency,
    show_based_on_service_category: args.show_based_on_service_category,
    service_category: sc,
    frequency: fq,
    sort_order: args.sort_order,
    excluded_providers: [],
    excluded_extras: [],
    excluded_services: [],
    show_based_on_variables: false,
    variables: {},
    qty_based: args.qty_based,
    apply_to_all_bookings: true,
    different_on_customer_end: false,
    show_explanation_icon_on_form: false,
    enable_popup_on_selection: false,
    popup_display: POPUP,
  };
}

const FREQ_ROWS: Array<{
  name: string;
  occurrence_time: 'onetime' | 'recurring';
  discount: number;
  is_default: boolean;
  frequency_repeats: string | null;
  shorter_job_length: string | null;
  shorter_job_length_by: string | null;
  frequency_discount: string | null;
  /** Keys of categories this frequency applies to (for industry_frequency.service_categories). */
  categoryKeys: CatKey[];
}> = [
  {
    name: '2x per week',
    occurrence_time: 'recurring',
    discount: 0,
    is_default: false,
    frequency_repeats: 'every-mon-fri',
    shorter_job_length: 'no',
    shorter_job_length_by: '0',
    frequency_discount: 'all',
    categoryKeys: ['deep', 'basic', 'move', 'construction', 'hourlyDeep', 'hourlyBasic'],
  },
  {
    name: '3x per week',
    occurrence_time: 'recurring',
    discount: 0,
    is_default: false,
    frequency_repeats: 'every-mon-wed-fri',
    shorter_job_length: 'no',
    shorter_job_length_by: '0',
    frequency_discount: 'all',
    categoryKeys: ['deep', 'basic'],
  },
  {
    name: 'Daily 5x per week',
    occurrence_time: 'recurring',
    discount: 10,
    is_default: false,
    frequency_repeats: 'daily-no-sat-sun',
    shorter_job_length: 'no',
    shorter_job_length_by: '0',
    frequency_discount: 'all',
    categoryKeys: ['deep', 'basic', 'move', 'construction', 'hourlyDeep', 'hourlyBasic'],
  },
  {
    name: 'One-Time',
    occurrence_time: 'onetime',
    discount: 0,
    is_default: true,
    frequency_repeats: null,
    shorter_job_length: 'no',
    shorter_job_length_by: '0',
    frequency_discount: 'all',
    categoryKeys: ['deep', 'basic', 'move', 'construction', 'hourlyDeep'],
  },
  {
    name: 'Weekly',
    occurrence_time: 'recurring',
    discount: 15,
    is_default: false,
    frequency_repeats: 'every-week',
    shorter_job_length: 'no',
    shorter_job_length_by: '0',
    frequency_discount: 'all',
    categoryKeys: ['deep', 'basic', 'hourlyBasic'],
  },
  {
    name: 'Every Other Week',
    occurrence_time: 'recurring',
    discount: 10,
    is_default: false,
    frequency_repeats: 'every-2-weeks',
    shorter_job_length: 'no',
    shorter_job_length_by: '0',
    frequency_discount: 'all',
    categoryKeys: ['deep', 'basic', 'hourlyBasic'],
  },
  {
    name: 'Monthly',
    occurrence_time: 'recurring',
    discount: 5,
    is_default: false,
    frequency_repeats: 'every-4-weeks',
    shorter_job_length: 'no',
    shorter_job_length_by: '0',
    frequency_discount: 'all',
    categoryKeys: ['deep', 'basic', 'hourlyBasic'],
  },
];

type ExtraTemplate = {
  name: string;
  /** Preset key from `INDUSTRY_FORM_ICON_PRESETS` (`value`). */
  icon: string;
  price: number;
  time_minutes: number;
  qty_based: boolean;
  /** Category names where this extra applies; empty = all services (no service filter). */
  serviceNames: string[];
};

/**
 * Optional extra names allowed per frequency (restricts extras with frequency deps).
 * Matches common Home Cleaning setups (e.g. 2x/week + Baseboards).
 */
const FREQUENCY_EXTRAS_BY_NAME: Record<string, string[]> = {
  '2x per week': ['Baseboards'],
};

/** Comma-separated names; matches admin exclude-parameter form (same strings as service categories / frequencies). */
const EXCLUDE_FORM1_SERVICE_CATEGORIES = [
  'Basic Cleaning',
  'Hourly Deep Clean',
  'Hourly Basic Clean',
  'Move In/Out Clean',
  'Construction Clean Up',
  'Deep Clean',
].join(', ');

/** Every seeded frequency name, for exclude-parameter dependency rows (all checked). */
const EXCLUDE_FORM1_ALL_FREQUENCIES = FORM1_ALL_FREQUENCY_NAMES_CSV;

const FORM1_ALL_EXTRA_SERVICE_CATEGORY_NAMES = SERVICE_CATEGORY_DEFS.map((d) => d.name);

const EXCLUDE_PARAM_TEMPLATES: Array<{
  name: string;
  description: string;
  /** Matches `value` in `INDUSTRY_FORM_ICON_PRESETS` for booking + admin icon resolution. */
  icon: string;
  price: number;
  time_minutes: number;
  sort_order: number;
  service_category: string;
  frequency: string;
}> = [
  {
    name: 'Bedroom',
    description: 'Partial cleaning: exclude an extra bedroom from the job (adjust time/price per quantity).',
    icon: 'bedroom',
    price: 5,
    time_minutes: 15,
    sort_order: 0,
    service_category: EXCLUDE_FORM1_SERVICE_CATEGORIES,
    frequency: EXCLUDE_FORM1_ALL_FREQUENCIES,
  },
  {
    name: 'Full Bathroom',
    description: 'Partial cleaning: exclude a full bathroom.',
    icon: 'full_bathroom',
    price: 10,
    time_minutes: 30,
    sort_order: 1,
    service_category: EXCLUDE_FORM1_SERVICE_CATEGORIES,
    frequency: EXCLUDE_FORM1_ALL_FREQUENCIES,
  },
  {
    name: 'Half Bathroom',
    description: 'Partial cleaning: exclude a half bathroom.',
    icon: 'half_bathroom',
    price: 5,
    time_minutes: 15,
    sort_order: 2,
    service_category: EXCLUDE_FORM1_SERVICE_CATEGORIES,
    frequency: EXCLUDE_FORM1_ALL_FREQUENCIES,
  },
  {
    name: 'Kitchen',
    description: 'Partial cleaning: exclude kitchen areas from the scope.',
    icon: 'kitchen',
    price: 10,
    time_minutes: 30,
    sort_order: 3,
    service_category: EXCLUDE_FORM1_SERVICE_CATEGORIES,
    frequency: EXCLUDE_FORM1_ALL_FREQUENCIES,
  },
  {
    name: 'Living Room',
    description: 'Partial cleaning: exclude living room areas.',
    icon: 'living_room',
    price: 10,
    time_minutes: 20,
    sort_order: 4,
    service_category: EXCLUDE_FORM1_SERVICE_CATEGORIES,
    frequency: EXCLUDE_FORM1_ALL_FREQUENCIES,
  },
];

const EXTRA_TEMPLATES: ExtraTemplate[] = [
  {
    name: 'Laundry',
    icon: 'laundry',
    price: 30,
    time_minutes: 60,
    qty_based: true,
    serviceNames: [...FORM1_ALL_EXTRA_SERVICE_CATEGORY_NAMES],
  },
  {
    name: 'Baseboards',
    icon: 'baseboards',
    price: 25,
    time_minutes: 39,
    qty_based: false,
    serviceNames: [...FORM1_ALL_EXTRA_SERVICE_CATEGORY_NAMES],
  },
  {
    name: 'Paint Removal',
    icon: 'paint',
    price: 100,
    time_minutes: 60,
    qty_based: true,
    serviceNames: [...FORM1_ALL_EXTRA_SERVICE_CATEGORY_NAMES],
  },
  {
    name: 'Heavy Duty',
    icon: 'heavy_duty',
    price: 50,
    time_minutes: 30,
    qty_based: false,
    serviceNames: [...FORM1_ALL_EXTRA_SERVICE_CATEGORY_NAMES],
  },
  {
    name: 'Inside Cabinets',
    icon: 'storage',
    price: 20,
    time_minutes: 29,
    qty_based: false,
    serviceNames: [...FORM1_ALL_EXTRA_SERVICE_CATEGORY_NAMES],
  },
  {
    name: 'Wet Wipe Window Blinds',
    icon: 'blinds',
    price: 20,
    time_minutes: 20,
    qty_based: false,
    serviceNames: [...FORM1_ALL_EXTRA_SERVICE_CATEGORY_NAMES],
  },
  {
    name: 'Inside Fridge',
    icon: 'fridge',
    price: 75,
    time_minutes: 40,
    qty_based: true,
    serviceNames: [...FORM1_ALL_EXTRA_SERVICE_CATEGORY_NAMES],
  },
  {
    name: 'Inside Oven',
    icon: 'oven',
    price: 50,
    time_minutes: 30,
    qty_based: true,
    serviceNames: [...FORM1_ALL_EXTRA_SERVICE_CATEGORY_NAMES],
  },
  {
    name: 'Dishes',
    icon: 'dishes',
    price: 20,
    time_minutes: 15,
    qty_based: true,
    serviceNames: [...FORM1_ALL_EXTRA_SERVICE_CATEGORY_NAMES],
  },
];

/**
 * Inserts Form 1 starter rows for a newly created industry. Safe to call once per industry; skips if any frequency already exists.
 */
export async function seedForm1IndustryTemplate(
  supabase: SupabaseClient,
  businessId: string,
  industryId: string,
): Promise<{ applied: boolean; skipped?: boolean; error?: string }> {
  try {
    const { count, error: cErr } = await supabase
      .from('industry_frequency')
      .select('*', { count: 'exact', head: true })
      .eq('industry_id', industryId);

    if (cErr) {
      return { applied: false, error: cErr.message };
    }
    if ((count ?? 0) > 0) {
      return { applied: false, skipped: true };
    }

    const varNamesFlat = {
      sqft: VARIABLES_BY_CATEGORY['Sq Ft'],
      bed: VARIABLES_BY_CATEGORY.Bedroom,
      bath: VARIABLES_BY_CATEGORY.Bathroom,
    };
    const bathroomVarNames = VARIABLES_BY_CATEGORY.Bathroom;

    const pricingVariablesPayload = [
      {
        business_id: businessId,
        industry_id: industryId,
        name: 'Sq Ft',
        category: 'Sq Ft',
        description: '',
        sort_order: 0,
        display: 'customer_frontend_backend_admin',
        is_active: true,
      },
      {
        business_id: businessId,
        industry_id: industryId,
        name: 'Bedroom',
        category: 'Bedroom',
        description: '',
        sort_order: 1,
        display: 'customer_frontend_backend_admin',
        is_active: true,
      },
      {
        business_id: businessId,
        industry_id: industryId,
        name: 'Bathroom',
        category: 'Bathroom',
        description: '',
        sort_order: 2,
        display: 'customer_frontend_backend_admin',
        is_active: true,
      },
    ];
    const { data: pvRows, error: pvErr } = await supabase
      .from('industry_pricing_variable')
      .insert(pricingVariablesPayload)
      .select('id, category');
    if (pvErr) return { applied: false, error: pvErr.message };

    const varIdByCategory = Object.fromEntries((pvRows ?? []).map((r) => [r.category as string, r.id as string])) as Record<
      string,
      string
    >;

    const categoryIdByKey: Partial<Record<CatKey, string>> = {};
    for (let i = 0; i < SERVICE_CATEGORY_DEFS.length; i++) {
      const def = SERVICE_CATEGORY_DEFS[i];
      const variables = { ...VARIABLES_BY_CATEGORY };
      const { data: cat, error: catErr } = await supabase
        .from('industry_service_category')
        .insert({
          business_id: businessId,
          industry_id: industryId,
          name: def.name,
          display: def.display,
          service_category_frequency: true,
          selected_frequencies: def.selected_frequencies,
          variables,
          sort_order: i,
        })
        .select('id')
        .single();
      if (catErr) return { applied: false, error: catErr.message };
      categoryIdByKey[def.key] = cat?.id as string;
    }

    const idsForKeys = (keys: CatKey[]) => keys.map((k) => categoryIdByKey[k]!).filter(Boolean);

    for (const fr of FREQ_ROWS) {
      const { error: fErr } = await supabase.from('industry_frequency').insert({
        business_id: businessId,
        industry_id: industryId,
        name: fr.name,
        display: 'Both',
        occurrence_time: fr.occurrence_time,
        discount: fr.discount,
        discount_type: '%',
        is_default: fr.is_default,
        popup_display: POPUP,
        frequency_repeats: fr.frequency_repeats,
        shorter_job_length: fr.shorter_job_length,
        shorter_job_length_by: fr.shorter_job_length_by,
        exclude_first_appointment: false,
        frequency_discount: fr.frequency_discount,
        charge_one_time_price: false,
        service_categories: idsForKeys(fr.categoryKeys),
        bathroom_variables: bathroomVarNames,
        sqft_variables: varNamesFlat.sqft,
        bedroom_variables: varNamesFlat.bed,
        exclude_parameters: [],
        extras: [],
        show_based_on_location: false,
        location_ids: [],
        is_active: true,
      });
      if (fErr) return { applied: false, error: fErr.message };
    }

    const pricingParamRows: Record<string, unknown>[] = [];
    let sort = 0;
    for (let si = 0; si < SQFT_PRICE_TIME.length; si++) {
      const row = SQFT_PRICE_TIME[si];
      pricingParamRows.push(
        buildPricingParameterInsertRow({
          business_id: businessId,
          industry_id: industryId,
          name: row.name,
          description: row.description,
          variable_category: 'Sq Ft',
          pricing_variable_id: varIdByCategory['Sq Ft'] ?? null,
          price: row.price,
          time_minutes: row.time,
          sort_order: sort++,
          is_default: si === 0,
          dependencyOverrides: {
            show_based_on_service_category: true,
            service_category: FORM1_ALL_SERVICE_CATEGORY_NAMES_CSV,
            show_based_on_frequency: true,
            frequency: FORM1_ALL_FREQUENCY_NAMES_CSV,
          },
        }),
      );
    }
    for (let bi = 0; bi < BEDROOM_ROWS.length; bi++) {
      const row = BEDROOM_ROWS[bi];
      pricingParamRows.push(
        buildPricingParameterInsertRow({
          business_id: businessId,
          industry_id: industryId,
          name: row.name,
          description: row.description,
          variable_category: 'Bedroom',
          pricing_variable_id: varIdByCategory.Bedroom ?? null,
          price: row.price,
          time_minutes: row.time,
          sort_order: sort++,
          is_default: row.name === '1 Bedroom',
          dependencyOverrides: {
            show_based_on_service_category: true,
            service_category: FORM1_ALL_SERVICE_CATEGORY_NAMES_CSV,
            show_based_on_frequency: true,
            frequency: FORM1_ALL_FREQUENCY_NAMES_CSV,
          },
        }),
      );
    }
    for (const def of SERVICE_CATEGORY_DEFS) {
      const bath = FORM1_BATHROOM_PRICING_BY_SERVICE_NAME[def.name];
      if (!bath) continue;
      const pairs: Array<[string, { price: number; time: number }, string]> = [
        ['Full Bathroom', bath.full, `Full bathroom (${def.name}).`],
        ['Half Bathroom', bath.half, `Half bathroom / powder room (${def.name}).`],
      ];
      for (const [bName, pt, desc] of pairs) {
        pricingParamRows.push(
          buildPricingParameterInsertRow({
            business_id: businessId,
            industry_id: industryId,
            name: bName,
            description: desc,
            variable_category: 'Bathroom',
            pricing_variable_id: varIdByCategory.Bathroom ?? null,
            price: pt.price,
            time_minutes: pt.time,
            sort_order: sort++,
            is_default: false,
            dependencyOverrides: {
              show_based_on_service_category: true,
              service_category: def.name,
              show_based_on_service_category2: true,
              service_category2: FORM1_BATHROOM_BEDROOM_DEPENDENCY,
              show_based_on_frequency: true,
              frequency: FORM1_ALL_FREQUENCY_NAMES_CSV,
            },
          }),
        );
      }
    }

    const { error: ppErr } = await supabase.from('industry_pricing_parameter').insert(pricingParamRows);
    if (ppErr) return { applied: false, error: ppErr.message };

    const extraIdByName: Record<string, string> = {};
    for (let i = 0; i < EXTRA_TEMPLATES.length; i++) {
      const ex = EXTRA_TEMPLATES[i];
      const scoped = ex.serviceNames.length > 0;
      const { data: row, error: exErr } = await supabase
        .from('industry_extras')
        .insert({
          business_id: businessId,
          industry_id: industryId,
          name: ex.name,
          icon: ex.icon,
          price: ex.price,
          time_minutes: ex.time_minutes,
          display: 'frontend-backend-admin',
          popup_display: 'customer_frontend_backend_admin',
          qty_based: ex.qty_based,
          show_based_on_service_category: scoped,
          service_category_options: scoped ? ex.serviceNames : [],
          sort_order: i,
        })
        .select('id')
        .single();
      if (exErr) return { applied: false, error: exErr.message };
      extraIdByName[ex.name] = row!.id as string;
    }

    const allExtraIds = Object.values(extraIdByName);

    const excludeIdList: string[] = [];
    for (const excl of EXCLUDE_PARAM_TEMPLATES) {
      const { data: exRow, error: exclErr } = await supabase
        .from('industry_exclude_parameter')
        .insert(
          buildExcludeParameterInsertRow({
            business_id: businessId,
            industry_id: industryId,
            name: excl.name,
            description: excl.description,
            icon: excl.icon,
            price: excl.price,
            time_minutes: excl.time_minutes,
            sort_order: excl.sort_order,
            qty_based: true,
            show_based_on_service_category: true,
            show_based_on_frequency: true,
            service_category: excl.service_category,
            frequency: excl.frequency,
          }),
        )
        .select('id')
        .single();
      if (exclErr) return { applied: false, error: exclErr.message };
      if (exRow?.id) excludeIdList.push(exRow.id as string);
    }

    for (const def of SERVICE_CATEGORY_DEFS) {
      const catId = categoryIdByKey[def.key];
      if (!catId) continue;
      const { error: upErr } = await supabase
        .from('industry_service_category')
        .update({
          extras: [],
          selected_exclude_parameters: excludeIdList,
        })
        .eq('id', catId);
      if (upErr) return { applied: false, error: upErr.message };
    }

    const { data: freqIdRows, error: freqIdErr } = await supabase
      .from('industry_frequency')
      .select('id, name')
      .eq('industry_id', industryId);
    if (freqIdErr) return { applied: false, error: freqIdErr.message };
    for (const fr of freqIdRows ?? []) {
      const extraNames = FREQUENCY_EXTRAS_BY_NAME[fr.name as string];
      if (!extraNames?.length) continue;
      const ids = extraNames.map((n) => extraIdByName[n]).filter(Boolean);
      if (!ids.length) continue;
      const { error: fxErr } = await supabase.from('industry_frequency').update({ extras: ids }).eq('id', fr.id);
      if (fxErr) return { applied: false, error: fxErr.message };
    }

    const { data: locRows } = await supabase.from('locations').select('id').eq('business_id', businessId);
    const freqIds = (freqIdRows ?? []).map((f) => f.id as string);
    const catIds = (Object.keys(categoryIdByKey) as CatKey[]).map((k) => categoryIdByKey[k]!).filter(Boolean);
    const varIds = (pvRows ?? []).map((v) => v.id as string);
    if (locRows?.length && freqIds.length && catIds.length) {
      for (const loc of locRows) {
        const { error: ilErr } = await supabase.from('industry_location').insert({
          location_id: loc.id,
          industry_id: industryId,
          business_id: businessId,
          frequency_ids: freqIds,
          service_category_ids: catIds,
          variable_ids: varIds,
          exclude_param_ids: excludeIdList,
          extra_ids: allExtraIds,
        });
        if (ilErr) return { applied: false, error: ilErr.message };
      }
    }

    const { error: defErr } = await supabase
      .from('industry_frequency')
      .update({ is_default: false })
      .eq('industry_id', industryId);
    if (defErr) return { applied: false, error: defErr.message };

    const { data: oneTime, error: otErr } = await supabase
      .from('industry_frequency')
      .select('id')
      .eq('industry_id', industryId)
      .eq('name', 'One-Time')
      .maybeSingle();
    if (otErr) return { applied: false, error: otErr.message };
    if (oneTime?.id) {
      const { error: u2 } = await supabase.from('industry_frequency').update({ is_default: true }).eq('id', oneTime.id);
      if (u2) return { applied: false, error: u2.message };
    }

    return { applied: true };
  } catch (e) {
    return { applied: false, error: e instanceof Error ? e.message : 'seed failed' };
  }
}
