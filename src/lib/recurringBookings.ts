/**
 * Recurring bookings: create N ahead, extend on demand (no cron).
 * Maps frequency to interval, skips holidays when configured.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getStoreOptionsScheduling, isDateHoliday } from './schedulingFilters';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Frequency name or frequency_repeats -> days to add for next occurrence */
function getDaysToAdd(frequencyName: string, frequencyRepeats?: string | null): number {
  const name = (frequencyName || '').toLowerCase().replace(/\s+/g, '-');
  const repeats = (frequencyRepeats || '').toLowerCase().replace(/\s+/g, '-');

  if (repeats.includes('daily')) return 1;
  if (repeats.includes('weekly') && !repeats.includes('bi') && !repeats.includes('every-2')) return 7;
  if (
    repeats.includes('bi') ||
    repeats.includes('every-other') ||
    repeats.includes('every-2') ||
    name.includes('bi-weekly') ||
    name.includes('biweekly') ||
    name.includes('every-other')
  )
    return 14;
  if (repeats.includes('monthly')) return 0; // special: add 1 month
  if (repeats.includes('yearly')) return 0; // special: add 1 year

  if (name.includes('daily')) return 1;
  if (name.includes('weekly') && !name.includes('bi')) return 7;
  if (name.includes('bi-weekly') || name.includes('biweekly')) return 14;
  if (name.includes('monthly')) return 0;
  if (name.includes('yearly')) return 0;

  return 7; // default weekly
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
  const days = getDaysToAdd(frequencyName, frequencyRepeats);
  const d = new Date(lastDate + 'T12:00:00');
  let next = addInterval(d, days, frequencyRepeats);
  let dateStr = next.toISOString().split('T')[0];

  if (skipHolidays) {
    const opts = await getStoreOptionsScheduling(businessId);
    const skip = opts?.holiday_skip_to_next ?? false;
    if (skip) {
      let attempts = 0;
      while (await isDateHoliday(businessId, dateStr) && attempts < 31) {
        next.setDate(next.getDate() + 1);
        dateStr = next.toISOString().split('T')[0];
        attempts++;
      }
    }
  }
  return dateStr;
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

  const bookings = dates.map((d) => bookingFromTemplate({ ...template, ...seriesRow, id: series.id }, d, businessId));

  const { data: inserted, error: insertError } = await supabase.from('bookings').insert(bookings).select('id');

  if (insertError) {
    await supabase.from('recurring_series').delete().eq('id', series.id);
    throw new Error(insertError.message ?? 'Failed to create recurring bookings');
  }

  const ids = (inserted ?? []).map((b: { id: string }) => b.id);
  return { seriesId: series.id, bookingIds: ids };
}

/** Extend a series: add more bookings if needed */
export async function extendRecurringSeries(
  supabase: SupabaseClient,
  businessId: string,
  seriesId: string
): Promise<{ created: number }> {
  const { data: series, error: seriesErr } = await supabase
    .from('recurring_series')
    .select('*')
    .eq('id', seriesId)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .single();

  if (seriesErr || !series) return { created: 0 };

  const { data: allInSeries } = await supabase
    .from('bookings')
    .select('scheduled_date')
    .eq('recurring_series_id', seriesId)
    .order('scheduled_date', { ascending: false });

  const lastDate = allInSeries?.[0]?.scheduled_date ?? series.start_date;
  const today = new Date().toISOString().split('T')[0];
  const futureCount = (allInSeries ?? []).filter((b) => (b.scheduled_date || '') >= today).length;
  const N = series.occurrences_ahead ?? 8;

  if (futureCount >= N) return { created: 0 };
  const toCreate = N - futureCount;

  const dates: string[] = [];
  let current = lastDate;
  for (let i = 0; i < toCreate; i++) {
    const next = await computeNextOccurrenceDate(
      businessId,
      current,
      series.frequency ?? '',
      series.frequency_repeats,
      true
    );
    if (series.end_date && next > series.end_date) break;
    dates.push(next);
    current = next;
  }

  if (dates.length === 0) return { created: 0 };

  const template = {
    id: series.id,
    customer_id: series.customer_id,
    customer_name: series.customer_name,
    customer_email: series.customer_email,
    customer_phone: series.customer_phone,
    service: series.service,
    address: series.address,
    apt_no: series.apt_no,
    zip_code: series.zip_code,
    notes: series.notes,
    total_price: series.total_price,
    scheduled_time: series.scheduled_time,
    duration_minutes: series.duration_minutes,
    customization: series.customization,
    provider_id: series.same_provider ? series.provider_id : null,
    provider_name: series.same_provider ? series.provider_name : null,
    provider_wage: series.provider_wage,
    provider_wage_type: series.provider_wage_type,
    payment_method: series.payment_method,
  };

  const bookings = dates.map((d) => bookingFromTemplate(template, d, businessId));
  const { data: inserted, error } = await supabase.from('bookings').insert(bookings).select('id');

  if (error) {
    console.error('Recurring extend error:', error);
    return { created: 0 };
  }
  return { created: inserted?.length ?? 0 };
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
    const { created } = await extendRecurringSeries(supabase, businessId, s.id);
    if (created > 0) totalCreated += created;
  }
  return { extended: seriesList?.length ?? 0, totalCreated };
}
