/**
 * Scheduling filters: holidays, spot limits, store options
 * Used by slot generation, booking APIs, etc.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export interface StoreOptionsScheduling {
  spots_based_on_provider_availability?: boolean;
  spot_limits_enabled?: boolean;
  holiday_skip_to_next?: boolean;
  holiday_blocked_who?: 'customer' | 'both';
  max_minutes_per_provider_per_booking?: number;
}

export interface SpotLimits {
  max_bookings_per_day: number;
  max_bookings_per_week: number;
  max_bookings_per_month: number;
  max_advance_booking_days: number;
  enabled: boolean;
}

export async function getStoreOptionsScheduling(businessId: string): Promise<StoreOptionsScheduling | null> {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  const { data } = await supabase
    .from('business_store_options')
    .select('spots_based_on_provider_availability, spot_limits_enabled, holiday_skip_to_next, holiday_blocked_who, max_minutes_per_provider_per_booking')
    .eq('business_id', businessId)
    .maybeSingle();
  return data as StoreOptionsScheduling | null;
}

export async function isDateHoliday(businessId: string, dateStr: string): Promise<boolean> {
  if (!supabaseUrl || !supabaseServiceKey) return false;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  const [year, month, day] = dateStr.split('-').map(Number);
  const { data: exact } = await supabase
    .from('business_holidays')
    .select('id')
    .eq('business_id', businessId)
    .eq('holiday_date', dateStr)
    .maybeSingle();
  if (exact) return true;
  const { data: recurringList } = await supabase
    .from('business_holidays')
    .select('holiday_date')
    .eq('business_id', businessId)
    .eq('recurring', true);
  const list = (recurringList as { holiday_date: string }[] | null) || [];
  for (const r of list) {
    const [ry, rm, rd] = (r.holiday_date || '').split('-').map(Number);
    if (rm === month && rd === day) return true;
  }
  return false;
}

export async function getSpotLimits(businessId: string): Promise<SpotLimits | null> {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  const { data } = await supabase
    .from('business_spot_limits')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();
  return data as SpotLimits | null;
}

export async function getBookingCountForDate(
  supabase: any,
  businessId: string,
  dateStr: string
): Promise<number> {
  const { count } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .or(`scheduled_date.eq.${dateStr},date.eq.${dateStr}`)
    .in('status', ['pending', 'confirmed', 'in_progress']);
  return count ?? 0;
}

export async function getBookingCountForWeek(
  supabase: any,
  businessId: string,
  weekStart: string
): Promise<number> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split('T')[0];
  const { count } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gte('scheduled_date', weekStart)
    .lte('scheduled_date', weekEndStr)
    .in('status', ['pending', 'confirmed', 'in_progress']);
  return count ?? 0;
}

/** Reserve slot maximum-by-day: per-day slots with time (HH:mm), maxJobs, displayOn */
export interface ReserveSlotDayConfig {
  enabled: boolean;
  slots: Array<{ id?: string; time: string; maxJobs: number; displayOn?: string }>;
}

export interface ReserveSlotSettings {
  maximumByDay: Record<string, ReserveSlotDayConfig>;
}

export async function getReserveSlotSettings(businessId: string): Promise<ReserveSlotSettings | null> {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from('business_reserve_slot_settings')
    .select('maximum_by_day')
    .eq('business_id', businessId)
    .maybeSingle();
  if (error || !data?.maximum_by_day || typeof data.maximum_by_day !== 'object') return null;
  return { maximumByDay: data.maximum_by_day as Record<string, ReserveSlotDayConfig> };
}

/** Normalize DB time (e.g. "09:00:00"), Date, ISO string, or display ("9:00 AM") to "HH:mm" for comparison */
export function normalizeTimeToHHmm(t: string | Date | null | undefined): string {
  if (t == null) return '';
  if (typeof t === 'object' && 'getHours' in t && typeof (t as Date).getHours === 'function') {
    const d = t as Date;
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const s = typeof t === 'string' ? t.trim() : String(t).trim();
  if (!s) return '';
  const amPm = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (amPm) {
    let h = parseInt(amPm[1], 10);
    const m = amPm[2] || '00';
    if (amPm[4].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (amPm[4].toUpperCase() === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  const already24 = s.match(/^(\d{1,2}):(\d{2})/);
  if (already24) {
    return `${already24[1].padStart(2, '0')}:${already24[2]}`;
  }
  const isoTime = s.match(/T(\d{1,2}):(\d{2})/);
  if (isoTime) {
    return `${isoTime[1].padStart(2, '0')}:${isoTime[2]}`;
  }
  const spaceTime = s.match(/\s(\d{1,2}):(\d{2})/);
  if (spaceTime) {
    return `${spaceTime[1].padStart(2, '0')}:${spaceTime[2]}`;
  }
  return s.slice(0, 5) || '';
}

/** Booking count per time for a date; keys are "HH:mm" (from scheduled_time or time) */
export async function getBookingCountByTimeForDate(
  supabase: any,
  businessId: string,
  dateStr: string
): Promise<Record<string, number>> {
  const { data: rows } = await supabase
    .from('bookings')
    .select('scheduled_time, time')
    .eq('business_id', businessId)
    .or(`scheduled_date.eq.${dateStr},date.eq.${dateStr}`)
    .in('status', ['pending', 'confirmed', 'in_progress']);
  const out: Record<string, number> = {};
  (rows || []).forEach((r: { scheduled_time?: string | Date; time?: string | Date } & Record<string, unknown>) => {
    const raw = r.scheduled_time ?? r.time ?? '';
    const key = normalizeTimeToHHmm(raw as string | Date);
    if (key) out[key] = (out[key] || 0) + 1;
  });
  return out;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Get day name from YYYY-MM-DD (use noon to avoid timezone shift) */
export function getDayNameFromDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return DAY_NAMES[0];
  const d = new Date(dateStr + 'T12:00:00');
  return DAY_NAMES[d.getDay()];
}

/** Booking Koala-style: return true if the time slot has capacity (or no reserve-slot limit for that time) */
export async function isTimeSlotAvailableForBooking(
  supabase: any,
  businessId: string,
  dateStr: string,
  timeStr: string
): Promise<boolean> {
  const settings = await getReserveSlotSettings(businessId);
  if (!settings?.maximumByDay) return true;
  const dayName = getDayNameFromDate(dateStr);
  const dayConfig = settings.maximumByDay[dayName];
  if (!dayConfig?.enabled || !dayConfig.slots?.length) return true;
  const hhmm = normalizeTimeToHHmm(timeStr);
  if (!hhmm) return true;
  const slot = dayConfig.slots.find(
    (s) => (s.displayOn ?? 'Both') === 'Both' && normalizeTimeToHHmm(s.time) === hhmm
  );
  if (!slot || slot.maxJobs == null) return true;
  const countsByTime = await getBookingCountByTimeForDate(supabase, businessId, dateStr);
  const count = countsByTime[hhmm] ?? 0;
  return count < slot.maxJobs;
}
