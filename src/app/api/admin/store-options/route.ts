import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';

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
  show_location_name_at_end: boolean;
  price_adjustment_note_enabled: boolean;
  time_adjustment_note_enabled: boolean;
  allow_customer_self_reschedule: boolean;
  reschedule_message: string | null;
  admin_bookings_default_view: 'calendar' | 'listing';
  admin_calendar_view_mode: 'month' | 'week' | 'day';
  admin_calendar_month_display: 'names' | 'dots';
  admin_calendar_multi_booking_layout: 'side_by_side' | 'overlapped';
  admin_calendar_hide_non_working_hours: boolean;
  /** Applied to guest/customer bookings when they do not send provider wage */
  default_provider_wage: number | null;
  default_provider_wage_type: 'percentage' | 'fixed' | 'hourly' | null;
  /** Customer portal: show My Drive nav and file uploads when true */
  customer_my_drive_enabled: boolean;
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
  show_location_name_at_end: false,
  price_adjustment_note_enabled: false,
  time_adjustment_note_enabled: false,
  allow_customer_self_reschedule: false,
  reschedule_message: null,
  admin_bookings_default_view: 'calendar',
  admin_calendar_view_mode: 'month',
  admin_calendar_month_display: 'names',
  admin_calendar_multi_booking_layout: 'side_by_side',
  admin_calendar_hide_non_working_hours: false,
  default_provider_wage: null,
  default_provider_wage_type: null,
  customer_my_drive_enabled: false,
  customer_booking_form_layout: 'form1',
};

function storeOptionsErrorMissingDefaultWageColumn(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('default_provider_wage') && (m.includes('column') || m.includes('schema'));
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      request.nextUrl.searchParams.get('businessId')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;
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
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const body = await request.json();
    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      (typeof body.businessId === 'string' ? body.businessId.trim() : '') ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    let wageColumnsAvailable = true;
    let existing: {
      id?: string;
      default_provider_wage?: unknown;
      default_provider_wage_type?: unknown;
      customer_my_drive_enabled?: boolean;
    } | null = null;

    const selWage = await supabase
      .from('business_store_options')
      .select('id, default_provider_wage, default_provider_wage_type, customer_my_drive_enabled')
      .eq('business_id', businessId)
      .maybeSingle();

    if (selWage.error && storeOptionsErrorMissingDefaultWageColumn(selWage.error.message || '')) {
      wageColumnsAvailable = false;
      const selId = await supabase
        .from('business_store_options')
        .select('id, customer_my_drive_enabled')
        .eq('business_id', businessId)
        .maybeSingle();
      if (selId.error) {
        console.error('Store options fetch existing error:', selId.error);
        return NextResponse.json({ error: selId.error.message }, { status: 500 });
      }
      existing = selId.data;
    } else if (selWage.error) {
      console.error('Store options fetch existing error:', selWage.error);
      return NextResponse.json({ error: selWage.error.message }, { status: 500 });
    } else {
      existing = selWage.data;
    }

    const parseStoredWage = (row: {
      default_provider_wage?: unknown;
      default_provider_wage_type?: unknown;
    } | null): { w: number | null; t: 'percentage' | 'fixed' | 'hourly' | null } => {
      if (!row) return { w: null, t: null };
      const w = row.default_provider_wage != null ? Number(row.default_provider_wage) : NaN;
      const tr = row.default_provider_wage_type != null ? String(row.default_provider_wage_type).trim().toLowerCase() : '';
      const t = tr === 'percentage' || tr === 'fixed' || tr === 'hourly' ? tr : null;
      if (Number.isFinite(w) && w > 0 && t) return { w, t };
      return { w: null, t: null };
    };

    const prevWage = parseStoredWage(existing);
    let default_provider_wage: number | null = prevWage.w;
    let default_provider_wage_type: 'percentage' | 'fixed' | 'hourly' | null = prevWage.t;

    const prevCustomerMyDrive =
      typeof existing?.customer_my_drive_enabled === 'boolean'
        ? existing.customer_my_drive_enabled
        : DEFAULT_OPTIONS.customer_my_drive_enabled;

    if ('default_provider_wage' in body || 'default_provider_wage_type' in body) {
      const wRaw = body.default_provider_wage;
      const tRaw = body.default_provider_wage_type;
      default_provider_wage = null;
      default_provider_wage_type = null;
      if (wRaw != null && wRaw !== '' && tRaw != null && String(tRaw).trim()) {
        const w = Number(wRaw);
        const t = String(tRaw).trim().toLowerCase();
        if (Number.isFinite(w) && w > 0 && (t === 'percentage' || t === 'fixed' || t === 'hourly')) {
          default_provider_wage = t === 'percentage' ? Math.min(100, w) : w;
          default_provider_wage_type = t;
        }
      }
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
      show_location_name_at_end: body.show_location_name_at_end ?? false,
      price_adjustment_note_enabled: body.price_adjustment_note_enabled ?? false,
      time_adjustment_note_enabled: body.time_adjustment_note_enabled ?? false,
      allow_customer_self_reschedule: body.allow_customer_self_reschedule ?? false,
      reschedule_message: body.reschedule_message ?? null,
      admin_bookings_default_view: ['calendar', 'listing'].includes(body.admin_bookings_default_view)
        ? body.admin_bookings_default_view
        : 'calendar',
      admin_calendar_view_mode: ['month', 'week', 'day'].includes(body.admin_calendar_view_mode)
        ? body.admin_calendar_view_mode
        : 'month',
      admin_calendar_month_display: ['names', 'dots'].includes(body.admin_calendar_month_display)
        ? body.admin_calendar_month_display
        : 'names',
      admin_calendar_multi_booking_layout: ['side_by_side', 'overlapped'].includes(
        body.admin_calendar_multi_booking_layout
      )
        ? body.admin_calendar_multi_booking_layout
        : 'side_by_side',
      admin_calendar_hide_non_working_hours: body.admin_calendar_hide_non_working_hours === true,
      default_provider_wage,
      default_provider_wage_type,
      customer_my_drive_enabled:
        'customer_my_drive_enabled' in body && typeof body.customer_my_drive_enabled === 'boolean'
          ? body.customer_my_drive_enabled
          : prevCustomerMyDrive,
      updated_at: new Date().toISOString(),
    };

    if (!wageColumnsAvailable) {
      delete (update as Record<string, unknown>).default_provider_wage;
      delete (update as Record<string, unknown>).default_provider_wage_type;
    }

    if (existing?.id) {
      let { data, error } = await supabase
        .from('business_store_options')
        .update(update)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error && storeOptionsErrorMissingDefaultWageColumn(error.message || '')) {
        wageColumnsAvailable = false;
        const update2 = { ...update } as Record<string, unknown>;
        delete update2.default_provider_wage;
        delete update2.default_provider_wage_type;
        const retry = await supabase
          .from('business_store_options')
          .update(update2)
          .eq('business_id', businessId)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error('Store options update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const merged = data ? { ...DEFAULT_OPTIONS, ...(data as Record<string, unknown>) } : null;
      return NextResponse.json({
        options: merged,
        default_provider_wage_migration_required: !wageColumnsAvailable,
      });
    }

    let { data, error } = await supabase
      .from('business_store_options')
      .insert({ business_id: businessId, ...update })
      .select()
      .single();

    if (error && storeOptionsErrorMissingDefaultWageColumn(error.message || '')) {
      wageColumnsAvailable = false;
      const update2 = { ...update } as Record<string, unknown>;
      delete update2.default_provider_wage;
      delete update2.default_provider_wage_type;
      const retry = await supabase
        .from('business_store_options')
        .insert({ business_id: businessId, ...update2 })
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Store options insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const merged = data ? { ...DEFAULT_OPTIONS, ...(data as Record<string, unknown>) } : null;
    return NextResponse.json({
      options: merged,
      default_provider_wage_migration_required: !wageColumnsAvailable,
    });
  } catch (e) {
    console.error('Store options PUT:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
