/**
 * Recurring bookings: keep one booking row + recurring_series, and generate
 * occurrence dates from series metadata. We auto-extend `occurrences_ahead`
 * on demand so recurring series remain effectively ongoing without cron.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getStoreOptionsScheduling, isDateHoliday } from './schedulingFilters';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * `frequency_repeats` values from admin (see frequencies/new/page.tsx) map to JS getDay():
 * 0 Sun … 6 Sat.
 */
const WEEKDAY_REPEAT_PATTERNS: Record<string, number[]> = {
  'every-mon-fri': [1, 5],
  'every-mon-wed-fri': [1, 3, 5],
  'every-tue-thu': [2, 4],
  'sat-sun': [0, 6],
  'every-tue-wed-fri': [2, 3, 5],
  'every-mon-wed': [1, 3],
  'every-mon-thu': [1, 4],
};

const TEXT_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

function normalizeRepeat(raw: string | null | undefined): string {
  return (raw || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-');
}

function parseEveryNUnit(repeatsRaw: string | null | undefined): { n: number; unit: 'day' | 'week' | 'month' | 'year' } | null {
  const repeats = normalizeRepeat(repeatsRaw);

  // every-2-weeks, every-two-weeks, every-month, every-3-months
  const m = /^every-([a-z0-9]+)?-?(day|days|week|weeks|month|months|year|years)$/.exec(repeats);
  if (!m) return null;

  const nRaw = m[1];
  const unitRaw = m[2];
  const n =
    nRaw == null || nRaw === ''
      ? 1
      : /^[0-9]+$/.test(nRaw)
        ? Math.max(1, parseInt(nRaw, 10))
        : Math.max(1, TEXT_NUMBERS[nRaw] || 1);

  const unit: 'day' | 'week' | 'month' | 'year' =
    unitRaw.startsWith('day') ? 'day' : unitRaw.startsWith('week') ? 'week' : unitRaw.startsWith('month') ? 'month' : 'year';
  return { n, unit };
}

/** Next calendar date strictly after lastDate whose weekday is in allowed (Mon–Fri, Mon & Fri, etc.). */
function nextAllowedWeekdayAfter(lastDate: string, allowed: number[]): string {
  const d = new Date(lastDate + 'T12:00:00');
  for (let i = 0; i < 14; i++) {
    d.setDate(d.getDate() + 1);
    if (allowed.includes(d.getDay())) {
      return d.toISOString().split('T')[0];
    }
  }
  return lastDate;
}

/** Frequency name or frequency_repeats -> days to add (fallback when pattern is unknown). */
function getDaysToAdd(frequencyName: string, frequencyRepeats?: string | null): number {
  const name = (frequencyName || '').toLowerCase().replace(/\s+/g, '-');
  const repeats = normalizeRepeat(frequencyRepeats);

  const parsedEvery = parseEveryNUnit(repeats);
  if (parsedEvery) {
    if (parsedEvery.unit === 'day') return parsedEvery.n;
    if (parsedEvery.unit === 'week') return parsedEvery.n * 7;
    if (parsedEvery.unit === 'month' || parsedEvery.unit === 'year') return 0;
  }
  if (repeats === 'every-week') return 7;

  if (repeats === 'daily') return 1;
  if (repeats === 'daily-no-sat-sun' || repeats === 'daily-no-sun') return 1;

  if (repeats.includes('weekly') && !repeats.includes('bi') && !repeats.includes('every-2')) return 7;
  if (
    repeats.includes('bi-weekly') ||
    repeats.includes('every-other-week') ||
    (repeats.includes('every-2-weeks') && /^every-2-weeks$/.test(repeats)) ||
    name.includes('bi-weekly') ||
    name.includes('biweekly') ||
    name.includes('every-other')
  )
    return 14;
  if (repeats.includes('monthly')) return 0;
  if (repeats.includes('yearly')) return 0;

  if (name.includes('daily') && !repeats.includes('daily-no')) return 1;
  if (name.includes('weekly') && !name.includes('bi')) return 7;
  if (name.includes('bi-weekly') || name.includes('biweekly')) return 14;
  if (name.includes('monthly')) return 0;
  if (name.includes('yearly')) return 0;

  return 7;
}

/**
 * Next occurrence date for recurring_series / bookings. Uses `frequency_repeats` (kebab-case) when set.
 */
export function getNextOccurrenceDateSync(
  lastDate: string,
  frequencyName: string,
  frequencyRepeats?: string | null
): string {
  const repeats = normalizeRepeat(frequencyRepeats);
  const name = (frequencyName || '').toLowerCase().replace(/\s+/g, '-');

  const parsedEvery = parseEveryNUnit(repeats);
  if (parsedEvery) {
    const d = new Date(lastDate + 'T12:00:00');
    if (parsedEvery.unit === 'day') d.setDate(d.getDate() + parsedEvery.n);
    if (parsedEvery.unit === 'week') d.setDate(d.getDate() + parsedEvery.n * 7);
    if (parsedEvery.unit === 'month') d.setMonth(d.getMonth() + parsedEvery.n);
    if (parsedEvery.unit === 'year') d.setFullYear(d.getFullYear() + parsedEvery.n);
    return d.toISOString().split('T')[0];
  }

  if (repeats.includes('monthly') || name.includes('monthly')) {
    return addInterval(new Date(lastDate + 'T12:00:00'), 0, 'monthly').toISOString().split('T')[0];
  }
  if (repeats.includes('yearly') || name.includes('yearly')) {
    return addInterval(new Date(lastDate + 'T12:00:00'), 0, 'yearly').toISOString().split('T')[0];
  }

  const weeksMatch = /^every-(\d+)-weeks$/.exec(repeats);
  if (weeksMatch) {
    const n = Math.max(1, parseInt(weeksMatch[1], 10));
    const d = new Date(lastDate + 'T12:00:00');
    d.setDate(d.getDate() + n * 7);
    return d.toISOString().split('T')[0];
  }

  if (repeats === 'every-week') {
    const d = new Date(lastDate + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }

  if (
    repeats.includes('bi-weekly') ||
    repeats.includes('every-other-week') ||
    name.includes('bi-weekly') ||
    name.includes('biweekly') ||
    name.includes('every-other')
  ) {
    const d = new Date(lastDate + 'T12:00:00');
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  }

  if (repeats === 'daily') {
    const d = new Date(lastDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  if (repeats === 'daily-no-sat-sun') {
    return nextAllowedWeekdayAfter(lastDate, [1, 2, 3, 4, 5]);
  }

  if (repeats === 'daily-no-sun') {
    let d = new Date(lastDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  const weekdays = WEEKDAY_REPEAT_PATTERNS[repeats];
  if (weekdays) {
    return nextAllowedWeekdayAfter(lastDate, weekdays);
  }

  const days = getDaysToAdd(frequencyName, frequencyRepeats);
  return addInterval(new Date(lastDate + 'T12:00:00'), days, frequencyRepeats).toISOString().split('T')[0];
}

/** Add days or months to a date */
function addInterval(date: Date, days: number, frequencyRepeats?: string | null): Date {
  const next = new Date(date);
  const repeats = (frequencyRepeats || '').toLowerCase();
  if (repeats.includes('monthly')) {
    next.setMonth(next.getMonth() + 1);
    return next;
  }
  if (repeats.includes('yearly')) {
    next.setFullYear(next.getFullYear() + 1);
    return next;
  }
  next.setDate(next.getDate() + days);
  return next;
}

/** Compute next occurrence date; if skipHolidays, advance past holidays */
export async function computeNextOccurrenceDate(
  businessId: string,
  lastDate: string,
  frequencyName: string,
  frequencyRepeats?: string | null,
  skipHolidays?: boolean
): Promise<string> {
  let dateStr = getNextOccurrenceDateSync(lastDate, frequencyName, frequencyRepeats);
  const next = new Date(dateStr + 'T12:00:00');

  if (skipHolidays) {
    const opts = await getStoreOptionsScheduling(businessId);
    const skip = opts?.holiday_skip_to_next ?? false;
    if (skip) {
      let attempts = 0;
      let d = next;
      while (await isDateHoliday(businessId, dateStr) && attempts < 31) {
        d.setDate(d.getDate() + 1);
        dateStr = d.toISOString().split('T')[0];
        attempts++;
      }
    }
  }
  return dateStr;
}

/** Compute occurrence dates for a series (sync, no holiday skip). Use when expanding recurring bookings for display. */
export function getOccurrenceDatesForSeriesSync(series: {
  start_date: string;
  end_date?: string | null;
  frequency?: string | null;
  frequency_repeats?: string | null;
  occurrences_ahead?: number;
}): string[] {
  const start = String(series.start_date || '').trim();
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return [];
  // Guardrail: prevent UI blowups if occurrences_ahead grows very large.
  const rawN = series.occurrences_ahead ?? 8;
  const N = Math.max(1, Math.min(260, rawN));
  const dates: string[] = [start];
  let current = start;
  for (let i = 1; i < N; i++) {
    const nextStr = getNextOccurrenceDateSync(current, series.frequency ?? '', series.frequency_repeats);
    if (series.end_date && nextStr > series.end_date) break;
    dates.push(nextStr);
    current = nextStr;
  }
  return dates;
}

/** Compute next N occurrence dates from startDate */
export async function computeOccurrenceDates(
  businessId: string,
  startDate: string,
  frequencyName: string,
  frequencyRepeats: string | null | undefined,
  count: number,
  endDate?: string | null,
  skipHolidays?: boolean
): Promise<string[]> {
  const dates: string[] = [startDate];
  let current = startDate;
  for (let i = 1; i < count; i++) {
    const next = await computeNextOccurrenceDate(businessId, current, frequencyName, frequencyRepeats, skipHolidays);
    if (endDate && next > endDate) break;
    dates.push(next);
    current = next;
  }
  return dates;
}

/** Build a booking row from series template for a given date */
function bookingFromTemplate(
  series: Record<string, unknown>,
  dateStr: string,
  businessId: string
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    business_id: businessId,
    recurring_series_id: series.id,
    scheduled_date: dateStr,
    date: dateStr,
    scheduled_time: series.scheduled_time ?? series.scheduledTime ?? null,
    time: series.scheduled_time ?? series.scheduledTime ?? null,
    service: series.service ?? null,
    address: series.address ?? 'Default Address',
    apt_no: series.apt_no ?? series.aptNo ?? null,
    zip_code: series.zip_code ?? series.zipCode ?? null,
    notes: series.notes ?? '',
    total_price: series.total_price ?? series.totalPrice ?? 0,
    amount: series.total_price ?? series.totalPrice ?? 0,
    frequency: series.frequency ?? null,
    duration_minutes: series.duration_minutes ?? series.durationMinutes ?? null,
    customization: series.customization ?? null,
    provider_id: series.provider_id ?? series.providerId ?? null,
    provider_name: series.provider_name ?? series.providerName ?? null,
    provider_wage: series.provider_wage ?? series.providerWage ?? null,
    provider_wage_type: series.provider_wage_type ?? series.providerWageType ?? null,
    payment_method: series.payment_method ?? series.paymentMethod ?? 'cash',
    payment_status: 'pending',
    customer_id: series.customer_id ?? series.customerId ?? null,
    customer_name: series.customer_name ?? series.customerName ?? null,
    customer_email: series.customer_email ?? series.customerEmail ?? null,
    customer_phone: series.customer_phone ?? series.customerPhone ?? null,
    status: 'pending',
    tip_amount: 0,
  };
  return row;
}

/** Create a recurring series and first N bookings */
export async function createRecurringSeries(
  supabase: SupabaseClient,
  businessId: string,
  template: Record<string, unknown>,
  options: {
    startDate: string;
    endDate?: string | null;
    frequencyName: string;
    frequencyRepeats?: string | null;
    occurrencesAhead?: number;
    sameProvider?: boolean;
  }
): Promise<{ seriesId: string; bookingIds: string[] }> {
  const opts = await getStoreOptionsScheduling(businessId);
  const skipHolidays = opts?.holiday_skip_to_next ?? false;
  const N = options.occurrencesAhead ?? 8;

  const seriesRow = {
    business_id: businessId,
    customer_id: template.customer_id ?? template.customerId ?? null,
    customer_name: template.customer_name ?? template.customerName ?? null,
    customer_email: template.customer_email ?? template.customerEmail ?? null,
    customer_phone: template.customer_phone ?? template.customerPhone ?? null,
    service: template.service ?? null,
    address: template.address ?? null,
    apt_no: template.apt_no ?? template.aptNo ?? null,
    zip_code: template.zip_code ?? template.zipCode ?? null,
    notes: template.notes ?? null,
    total_price: template.total_price ?? template.totalPrice ?? 0,
    frequency: options.frequencyName,
    frequency_repeats: options.frequencyRepeats ?? null,
    scheduled_time: template.scheduled_time ?? template.scheduledTime ?? template.time ?? null,
    duration_minutes: template.duration_minutes ?? template.durationMinutes ?? null,
    customization: template.customization ?? null,
    provider_id: template.provider_id ?? template.service_provider_id ?? template.providerId ?? null,
    provider_name: template.provider_name ?? template.providerName ?? null,
    provider_wage: template.provider_wage ?? template.providerWage ?? null,
    provider_wage_type: template.provider_wage_type ?? template.providerWageType ?? null,
    payment_method: template.payment_method ?? template.paymentMethod ?? 'cash',
    start_date: options.startDate,
    end_date: options.endDate ?? null,
    occurrences_ahead: N,
    same_provider: options.sameProvider ?? true,
    status: 'active',
  };

  const { data: series, error: seriesError } = await supabase
    .from('recurring_series')
    .insert(seriesRow)
    .select('id')
    .single();

  if (seriesError || !series) {
    throw new Error(seriesError?.message ?? 'Failed to create recurring series');
  }

  const dates = await computeOccurrenceDates(
    businessId,
    options.startDate,
    options.frequencyName,
    options.frequencyRepeats,
    N,
    options.endDate ?? undefined,
    skipHolidays
  );

  // One booking row per recurring series (first occurrence date); other dates are derived from series when displaying
  const firstDate = dates[0] ?? options.startDate;
  const singleBooking = bookingFromTemplate({ ...template, ...seriesRow, id: series.id }, firstDate, businessId);

  const { data: inserted, error: insertError } = await supabase.from('bookings').insert(singleBooking).select('id').single();

  if (insertError) {
    await supabase.from('recurring_series').delete().eq('id', series.id);
    throw new Error(insertError.message ?? 'Failed to create recurring booking');
  }

  const bookingId = (inserted as { id: string } | null)?.id;
  if (!bookingId) {
    await supabase.from('recurring_series').delete().eq('id', series.id);
    throw new Error('Failed to create recurring booking');
  }
  return { seriesId: series.id, bookingIds: [bookingId] };
}

type RecurringSeriesRow = {
  id: string;
  start_date: string;
  end_date?: string | null;
  frequency?: string | null;
  frequency_repeats?: string | null;
  occurrences_ahead?: number | null;
  status?: string | null;
};

/** Recurring series use 1 booking row; extend updates series horizon only. */
export async function extendRecurringSeries(
  supabase: SupabaseClient,
  businessId: string,
  seriesId: string
): Promise<{ created: number }> {
  const { data: series, error } = await supabase
    .from('recurring_series')
    .select('id, start_date, end_date, frequency, frequency_repeats, occurrences_ahead, status')
    .eq('business_id', businessId)
    .eq('id', seriesId)
    .maybeSingle();

  if (error || !series) return { created: 0 };
  if ((series as RecurringSeriesRow).status && (series as RecurringSeriesRow).status !== 'active') {
    return { created: 0 };
  }

  const row = series as RecurringSeriesRow;
  const startDate = String(row.start_date || '').trim();
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { created: 0 };

  const currentN = Math.max(1, Number(row.occurrences_ahead ?? 1));
  // Keep roughly 12 weeks of runway ahead (frequency-aware), without runaway growth.
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 84);
  const horizonStr = horizon.toISOString().split('T')[0];

  let lastDate = startDate;
  for (let i = 1; i < currentN; i++) {
    const nextStr = getNextOccurrenceDateSync(lastDate, row.frequency ?? '', row.frequency_repeats ?? null);
    if (row.end_date && nextStr > row.end_date) {
      lastDate = nextStr;
      break;
    }
    lastDate = nextStr;
  }

  if (row.end_date && lastDate >= row.end_date) return { created: 0 };
  if (lastDate >= horizonStr) return { created: 0 };

  let addBy = 0;
  let cursor = lastDate;
  // Hard limit to avoid huge increments in one call.
  while (cursor < horizonStr && addBy < 64) {
    const nextStr = getNextOccurrenceDateSync(cursor, row.frequency ?? '', row.frequency_repeats ?? null);
    if (row.end_date && nextStr > row.end_date) break;
    cursor = nextStr;
    addBy++;
  }
  if (addBy <= 0) return { created: 0 };

  const nextN = currentN + addBy;

  const { error: updateError } = await supabase
    .from('recurring_series')
    .update({ occurrences_ahead: nextN })
    .eq('id', seriesId)
    .eq('business_id', businessId);

  if (updateError) return { created: 0 };
  return { created: addBy };
}

/** Extend all active series for a business that need more occurrences */
export async function extendAllRecurringSeries(
  supabase: SupabaseClient,
  businessId: string
): Promise<{ extended: number; totalCreated: number }> {
  const { data: seriesList } = await supabase
    .from('recurring_series')
    .select('id')
    .eq('business_id', businessId)
    .eq('status', 'active');

  let totalCreated = 0;
  for (const s of seriesList ?? []) {
    try {
      const { created } = await extendRecurringSeries(supabase, businessId, s.id);
      if (created > 0) totalCreated += created;
    } catch (e) {
      // Keep extending other series even if one row is malformed.
      console.warn('[extendAllRecurringSeries] skip series after error', s.id, e);
    }
  }
  return { extended: seriesList?.length ?? 0, totalCreated };
}
