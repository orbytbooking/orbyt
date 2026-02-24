import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export type SchedulingType = 'accepted_automatically' | 'accept_or_decline' | 'accepts_same_day_only';

export type BookingCompletionMode = 'manual' | 'automatic';

export type ProviderAssignmentMode = 'manual' | 'automatic';
export type RecurringUpdateDefault = 'this_booking_only' | 'all_future';
export type HolidayBlockedWho = 'customer' | 'both';
export type TimeTrackingMode = 'timestamps_only' | 'timestamps_and_gps';
export type DistanceUnit = 'miles' | 'kilometers';
export type LocationManagement = 'zip' | 'name' | 'none';

export interface BusinessStoreOptions {
  id: string;
  business_id: string;
  scheduling_type: SchedulingType;
  accept_decline_timeout_minutes: number;
  providers_can_see_unassigned: boolean;
  providers_can_see_all_unassigned: boolean;
  notify_providers_on_unassigned: boolean;
  waitlist_enabled: boolean;
  clock_in_out_enabled: boolean;
  booking_completion_mode: BookingCompletionMode;
  spots_based_on_provider_availability: boolean;
  provider_assignment_mode: ProviderAssignmentMode;
  recurring_update_default: RecurringUpdateDefault;
  specific_provider_for_customers: boolean;
  specific_provider_for_admin: boolean;
  same_provider_for_recurring_cron: boolean;
  max_minutes_per_provider_per_booking: number;
  spot_limits_enabled: boolean;
  holiday_skip_to_next: boolean;
  holiday_blocked_who: HolidayBlockedWho;
  show_provider_score_to_customers: boolean;
  show_provider_completed_jobs_to_customers: boolean;
  show_provider_availability_to_customers: boolean;
  time_tracking_mode: TimeTrackingMode;
  distance_unit: DistanceUnit;
  disable_auto_clock_in: boolean;
  auto_clock_out_enabled: boolean;
  auto_clock_out_distance_meters: number;
  completion_on_clock_out: boolean;
  allow_reclock_in: boolean;
  time_log_updates_booking: boolean;
  location_management: LocationManagement;
  wildcard_zip_enabled: boolean;
}

const DEFAULT_OPTIONS: Omit<BusinessStoreOptions, 'id' | 'business_id'> = {
  scheduling_type: 'accepted_automatically',
  accept_decline_timeout_minutes: 60,
  providers_can_see_unassigned: true,
  providers_can_see_all_unassigned: false,
  notify_providers_on_unassigned: true,
  waitlist_enabled: false,
  clock_in_out_enabled: false,
  booking_completion_mode: 'manual',
  spots_based_on_provider_availability: true,
  provider_assignment_mode: 'automatic',
  recurring_update_default: 'all_future',
  specific_provider_for_customers: false,
  specific_provider_for_admin: true,
  same_provider_for_recurring_cron: true,
  max_minutes_per_provider_per_booking: 0,
  spot_limits_enabled: false,
  holiday_skip_to_next: false,
  holiday_blocked_who: 'customer',
  show_provider_score_to_customers: true,
  show_provider_completed_jobs_to_customers: true,
  show_provider_availability_to_customers: true,
  time_tracking_mode: 'timestamps_only',
  distance_unit: 'miles',
  disable_auto_clock_in: false,
  auto_clock_out_enabled: false,
  auto_clock_out_distance_meters: 500,
  completion_on_clock_out: false,
  allow_reclock_in: false,
  time_log_updates_booking: false,
  location_management: 'zip',
  wildcard_zip_enabled: true,
};

async function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase config');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: NextRequest) {
  try {
    const businessId = request.headers.get('x-business-id') || request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('business_store_options')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      console.error('Store options fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const options: BusinessStoreOptions = data
      ? { ...DEFAULT_OPTIONS, ...data }
      : { id: '', business_id: businessId, ...DEFAULT_OPTIONS };

    return NextResponse.json({ options });
  } catch (e) {
    console.error('Store options GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const businessId = request.headers.get('x-business-id') || body.businessId;
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const update: Partial<BusinessStoreOptions> = {
      scheduling_type: body.scheduling_type ?? 'accepted_automatically',
      accept_decline_timeout_minutes: Math.max(5, Math.min(1440, Number(body.accept_decline_timeout_minutes) || 60)),
      providers_can_see_unassigned: body.providers_can_see_unassigned ?? true,
      providers_can_see_all_unassigned: body.providers_can_see_all_unassigned ?? false,
      notify_providers_on_unassigned: body.notify_providers_on_unassigned ?? true,
      waitlist_enabled: body.waitlist_enabled ?? false,
      clock_in_out_enabled: body.clock_in_out_enabled ?? false,
      booking_completion_mode: ['manual', 'automatic'].includes(body.booking_completion_mode)
        ? body.booking_completion_mode
        : 'manual',
      spots_based_on_provider_availability: body.spots_based_on_provider_availability ?? true,
      provider_assignment_mode: ['manual', 'automatic'].includes(body.provider_assignment_mode)
        ? body.provider_assignment_mode
        : 'automatic',
      recurring_update_default: ['this_booking_only', 'all_future'].includes(body.recurring_update_default)
        ? body.recurring_update_default
        : 'all_future',
      specific_provider_for_customers: body.specific_provider_for_customers ?? false,
      specific_provider_for_admin: body.specific_provider_for_admin ?? true,
      same_provider_for_recurring_cron: body.same_provider_for_recurring_cron ?? true,
      max_minutes_per_provider_per_booking: Math.max(0, Math.min(1440, Number(body.max_minutes_per_provider_per_booking) || 0)),
      spot_limits_enabled: body.spot_limits_enabled ?? false,
      holiday_skip_to_next: body.holiday_skip_to_next ?? false,
      holiday_blocked_who: ['customer', 'both'].includes(body.holiday_blocked_who)
        ? body.holiday_blocked_who
        : 'customer',
      show_provider_score_to_customers: body.show_provider_score_to_customers ?? true,
      show_provider_completed_jobs_to_customers: body.show_provider_completed_jobs_to_customers ?? true,
      show_provider_availability_to_customers: body.show_provider_availability_to_customers ?? true,
      time_tracking_mode: ['timestamps_only', 'timestamps_and_gps'].includes(body.time_tracking_mode)
        ? body.time_tracking_mode
        : 'timestamps_only',
      distance_unit: ['miles', 'kilometers'].includes(body.distance_unit) ? body.distance_unit : 'miles',
      disable_auto_clock_in: body.disable_auto_clock_in ?? false,
      auto_clock_out_enabled: body.auto_clock_out_enabled ?? false,
      auto_clock_out_distance_meters: Math.max(100, Math.min(10000, Number(body.auto_clock_out_distance_meters) || 500)),
      completion_on_clock_out: body.completion_on_clock_out ?? false,
      allow_reclock_in: body.allow_reclock_in ?? false,
      time_log_updates_booking: body.time_log_updates_booking ?? false,
      location_management: ['zip', 'name', 'none'].includes(body.location_management)
        ? body.location_management
        : 'zip',
      wildcard_zip_enabled: body.wildcard_zip_enabled ?? true,
      updated_at: new Date().toISOString(),
    };

    const supabase = await getSupabase();
    const { data: existing } = await supabase
      .from('business_store_options')
      .select('id')
      .eq('business_id', businessId)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabase
        .from('business_store_options')
        .update(update)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        console.error('Store options update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ options: data });
    }

    const { data, error } = await supabase
      .from('business_store_options')
      .insert({ business_id: businessId, ...update })
      .select()
      .single();

    if (error) {
      console.error('Store options insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ options: data });
  } catch (e) {
    console.error('Store options PUT:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
