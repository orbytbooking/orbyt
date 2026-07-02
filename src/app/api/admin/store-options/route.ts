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
  gift_card_min_amount: number;
  gift_card_allow_edit_below_min: boolean;
  gift_card_max_limit_enabled: boolean;
  gift_card_max_amount: number | null;
  referral_credit_referred: number;
  referral_credit_referrer: number;
  payment_card_hold_description: string | null;
  payment_charge_booking_description: string | null;
  payment_separate_charge_description: string | null;
  payment_charge_invoice_description: string | null;
  /** Store Info: customer may pay by card at checkout */
  accepted_payment_credit_card: boolean;
  /** Store Info: customer may pay cash/check at checkout */
  accepted_payment_cash_check: boolean;
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
  gift_card_min_amount: 150,
  gift_card_allow_edit_below_min: false,
  gift_card_max_limit_enabled: true,
  gift_card_max_amount: null,
  referral_credit_referred: 50,
  referral_credit_referrer: 50,
  payment_card_hold_description: 'Card hold for premierprocleaner by OrbytBooking -',
  payment_charge_booking_description: 'Amount charged by OrbytBooking.',
  payment_separate_charge_description: null,
  payment_charge_invoice_description: null,
  accepted_payment_credit_card: true,
  accepted_payment_cash_check: false,
};

const ADMIN_GENERAL_STORE_OPTION_KEYS = [
  'gift_card_min_amount',
  'gift_card_allow_edit_below_min',
  'gift_card_max_limit_enabled',
  'gift_card_max_amount',
  'referral_credit_referred',
  'referral_credit_referrer',
  'payment_card_hold_description',
  'payment_charge_booking_description',
  'payment_separate_charge_description',
  'payment_charge_invoice_description',
] as const;

function storeOptionsErrorMissingAcceptedPaymentColumns(message: string): boolean {
  const m = message.toLowerCase();
  if (!m.includes('column') && !m.includes('schema')) return false;
  return m.includes('accepted_payment_credit_card') || m.includes('accepted_payment_cash_check');
}

function stripAcceptedPaymentFields(update: Record<string, unknown>): void {
  delete update.accepted_payment_credit_card;
  delete update.accepted_payment_cash_check;
}

function resolveAcceptedPaymentFields(
  body: Record<string, unknown>,
  prev: BusinessStoreOptions,
): Pick<BusinessStoreOptions, 'accepted_payment_credit_card' | 'accepted_payment_cash_check'> {
  return {
    accepted_payment_credit_card:
      'accepted_payment_credit_card' in body
        ? Boolean(body.accepted_payment_credit_card)
        : prev.accepted_payment_credit_card,
    accepted_payment_cash_check:
      'accepted_payment_cash_check' in body
        ? Boolean(body.accepted_payment_cash_check)
        : prev.accepted_payment_cash_check,
  };
}

function storeOptionsErrorMissingDefaultWageColumn(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('default_provider_wage') && (m.includes('column') || m.includes('schema'));
}

function storeOptionsErrorMissingAdminGeneralColumns(message: string): boolean {
  const m = message.toLowerCase();
  if (!m.includes('column') && !m.includes('schema')) return false;
  return ADMIN_GENERAL_STORE_OPTION_KEYS.some((key) => m.includes(key));
}

function parseNonNegativeMoney(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n * 100) / 100;
}

function parseOptionalMoney(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

function parseOptionalDescription(value: unknown, fallback: string | null): string | null {
  if (value == null) return fallback;
  const s = String(value).trim();
  return s || null;
}

function stripAdminGeneralFields(update: Record<string, unknown>): void {
  for (const key of ADMIN_GENERAL_STORE_OPTION_KEYS) {
    delete update[key];
  }
}

function resolveAdminGeneralFields(
  body: Record<string, unknown>,
  prev: BusinessStoreOptions,
): Pick<
  BusinessStoreOptions,
  (typeof ADMIN_GENERAL_STORE_OPTION_KEYS)[number]
> {
  const maxLimitEnabled =
    'gift_card_max_limit_enabled' in body
      ? Boolean(body.gift_card_max_limit_enabled)
      : prev.gift_card_max_limit_enabled;

  let gift_card_max_amount = prev.gift_card_max_amount;
  if ('gift_card_max_amount' in body || 'gift_card_max_limit_enabled' in body) {
    gift_card_max_amount = maxLimitEnabled ? parseOptionalMoney(body.gift_card_max_amount) : null;
  }

  return {
    gift_card_min_amount:
      'gift_card_min_amount' in body
        ? parseNonNegativeMoney(body.gift_card_min_amount, prev.gift_card_min_amount)
        : prev.gift_card_min_amount,
    gift_card_allow_edit_below_min:
      'gift_card_allow_edit_below_min' in body
        ? Boolean(body.gift_card_allow_edit_below_min)
        : prev.gift_card_allow_edit_below_min,
    gift_card_max_limit_enabled: maxLimitEnabled,
    gift_card_max_amount,
    referral_credit_referred:
      'referral_credit_referred' in body
        ? parseNonNegativeMoney(body.referral_credit_referred, prev.referral_credit_referred)
        : prev.referral_credit_referred,
    referral_credit_referrer:
      'referral_credit_referrer' in body
        ? parseNonNegativeMoney(body.referral_credit_referrer, prev.referral_credit_referrer)
        : prev.referral_credit_referrer,
    payment_card_hold_description:
      'payment_card_hold_description' in body
        ? parseOptionalDescription(body.payment_card_hold_description, prev.payment_card_hold_description)
        : prev.payment_card_hold_description,
    payment_charge_booking_description:
      'payment_charge_booking_description' in body
        ? parseOptionalDescription(body.payment_charge_booking_description, prev.payment_charge_booking_description)
        : prev.payment_charge_booking_description,
    payment_separate_charge_description:
      'payment_separate_charge_description' in body
        ? parseOptionalDescription(body.payment_separate_charge_description, prev.payment_separate_charge_description)
        : prev.payment_separate_charge_description,
    payment_charge_invoice_description:
      'payment_charge_invoice_description' in body
        ? parseOptionalDescription(body.payment_charge_invoice_description, prev.payment_charge_invoice_description)
        : prev.payment_charge_invoice_description,
  };
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

    let adminGeneralColumnsAvailable = true;
    const prevRow: BusinessStoreOptions = {
      ...DEFAULT_OPTIONS,
      ...((existing ?? {}) as Partial<BusinessStoreOptions>),
      business_id: businessId,
      id: existing?.id ?? '',
    };
    const adminGeneralFields = resolveAdminGeneralFields(body as Record<string, unknown>, prevRow);
    const acceptedPaymentFields = resolveAcceptedPaymentFields(body as Record<string, unknown>, prevRow);
    let acceptedPaymentColumnsAvailable = true;

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
      ...adminGeneralFields,
      ...acceptedPaymentFields,
      updated_at: new Date().toISOString(),
    };

    if (!wageColumnsAvailable) {
      delete (update as Record<string, unknown>).default_provider_wage;
      delete (update as Record<string, unknown>).default_provider_wage_type;
    }

    if (!adminGeneralColumnsAvailable) {
      stripAdminGeneralFields(update as Record<string, unknown>);
    }

    if (!acceptedPaymentColumnsAvailable) {
      stripAcceptedPaymentFields(update as Record<string, unknown>);
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

      if (error && storeOptionsErrorMissingAdminGeneralColumns(error.message || '')) {
        adminGeneralColumnsAvailable = false;
        const update2 = { ...update } as Record<string, unknown>;
        stripAdminGeneralFields(update2);
        const retry = await supabase
          .from('business_store_options')
          .update(update2)
          .eq('business_id', businessId)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error && storeOptionsErrorMissingAcceptedPaymentColumns(error.message || '')) {
        acceptedPaymentColumnsAvailable = false;
        const update2 = { ...update } as Record<string, unknown>;
        stripAcceptedPaymentFields(update2);
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
        admin_general_settings_migration_required: !adminGeneralColumnsAvailable,
        accepted_payment_forms_migration_required: !acceptedPaymentColumnsAvailable,
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

    if (error && storeOptionsErrorMissingAdminGeneralColumns(error.message || '')) {
      adminGeneralColumnsAvailable = false;
      const update2 = { ...update } as Record<string, unknown>;
      stripAdminGeneralFields(update2);
      const retry = await supabase
        .from('business_store_options')
        .insert({ business_id: businessId, ...update2 })
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error && storeOptionsErrorMissingAcceptedPaymentColumns(error.message || '')) {
      acceptedPaymentColumnsAvailable = false;
      const update2 = { ...update } as Record<string, unknown>;
      stripAcceptedPaymentFields(update2);
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
      admin_general_settings_migration_required: !adminGeneralColumnsAvailable,
      accepted_payment_forms_migration_required: !acceptedPaymentColumnsAvailable,
    });
  } catch (e) {
    console.error('Store options PUT:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
