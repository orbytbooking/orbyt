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
    .eq('scheduled_date', dateStr)
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
