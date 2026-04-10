import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';

export interface CancellationSettingsPayload {
  chargeFee?: 'yes' | 'no';
  feeType?: 'single' | 'multiple';
  feeAmount?: string;
  feeCurrency?: string;
  payProvider?: boolean;
  overrideServiceCategory?: boolean;
  chargeWhen?: 'after_time_day_before' | 'hours_before';
  afterTime?: string;
  afterAmPm?: 'AM' | 'PM';
  hoursBefore?: string;
  excludeSameDay?: boolean;
  allowPostponeBookings?: 'yes' | 'no';
  allowPostponePrecharged?: 'yes' | 'no';
  postponePrechargedAction?: 'refund' | 'no_refund';
  /** Store options → Customer → Cancellation */
  allowCustomerSelfCancel?: 'yes' | 'no';
  customerCancelOneTime?: boolean;
  customerCancelRecurring?: boolean;
  recurringCancelSingleBooking?: boolean;
  recurringCancelFromPointOnward?: boolean;
  recurringCancelEntireSeries?: boolean;
  customerCancelCategoryIds?: Record<string, boolean>;
  customerCancelAllCategories?: boolean;
  adminConfirmCancellation?: 'yes' | 'no';
  adminConfirmCancellationScope?: 'one_time' | 'recurring' | 'both';
  refundPrechargedOnCustomerCancel?: 'yes' | 'no';
  /** Rich HTML shown when allowCustomerSelfCancel is no */
  customerSelfCancelBlockedMessage?: string;
  multipleFees?: Array<{
    id: string;
    fee: string;
    currency: string;
    chargeTiming: 'beforeDay' | 'hoursBefore';
    beforeDayTime?: string;
    hoursBefore: string;
  }>;
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
      .from('business_cancellation_settings')
      .select('settings')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      console.error('Cancellation settings fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings: CancellationSettingsPayload = (data?.settings as CancellationSettingsPayload) || {};
    return NextResponse.json({ settings });
  } catch (e) {
    console.error('Cancellation settings GET:', e);
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

    const rawCategoryIds = body.customerCancelCategoryIds;
    const customerCancelCategoryIds: Record<string, boolean> =
      rawCategoryIds && typeof rawCategoryIds === 'object' && !Array.isArray(rawCategoryIds)
        ? Object.fromEntries(
            Object.entries(rawCategoryIds as Record<string, unknown>).filter(
              ([, v]) => typeof v === 'boolean'
            ) as [string, boolean][]
          )
        : {};

    const settings: CancellationSettingsPayload = {
      chargeFee: body.chargeFee === 'no' ? 'no' : (body.chargeFee || 'yes'),
      feeType: body.feeType === 'multiple' ? 'multiple' : 'single',
      feeAmount: typeof body.feeAmount === 'string' ? body.feeAmount : (body.feeAmount ?? '0'),
      feeCurrency: typeof body.feeCurrency === 'string' ? body.feeCurrency : '$',
      payProvider: !!body.payProvider,
      overrideServiceCategory: !!body.overrideServiceCategory,
      chargeWhen: body.chargeWhen === 'hours_before' ? 'hours_before' : 'after_time_day_before',
      afterTime: typeof body.afterTime === 'string' ? body.afterTime : '06:00',
      afterAmPm: body.afterAmPm === 'AM' ? 'AM' : 'PM',
      hoursBefore: typeof body.hoursBefore === 'string' ? body.hoursBefore : '24',
      excludeSameDay: !!body.excludeSameDay,
      allowPostponeBookings: body.allowPostponeBookings === 'no' ? 'no' : (body.allowPostponeBookings || 'yes'),
      allowPostponePrecharged: body.allowPostponePrecharged === 'yes' ? 'yes' : (body.allowPostponePrecharged || 'no'),
      postponePrechargedAction: body.postponePrechargedAction === 'refund' ? 'refund' : (body.postponePrechargedAction || 'no_refund'),
      allowCustomerSelfCancel: body.allowCustomerSelfCancel === 'no' ? 'no' : (body.allowCustomerSelfCancel || 'yes'),
      customerCancelOneTime: body.customerCancelOneTime !== false,
      customerCancelRecurring: body.customerCancelRecurring !== false,
      recurringCancelSingleBooking: body.recurringCancelSingleBooking !== false,
      recurringCancelFromPointOnward: body.recurringCancelFromPointOnward !== false,
      recurringCancelEntireSeries: !!body.recurringCancelEntireSeries,
      customerCancelCategoryIds,
      customerCancelAllCategories: !!body.customerCancelAllCategories,
      adminConfirmCancellation: body.adminConfirmCancellation === 'no' ? 'no' : (body.adminConfirmCancellation || 'yes'),
      adminConfirmCancellationScope:
        body.adminConfirmCancellationScope === 'one_time' ||
        body.adminConfirmCancellationScope === 'recurring' ||
        body.adminConfirmCancellationScope === 'both'
          ? body.adminConfirmCancellationScope
          : 'both',
      refundPrechargedOnCustomerCancel:
        body.refundPrechargedOnCustomerCancel === 'no' ? 'no' : (body.refundPrechargedOnCustomerCancel || 'yes'),
      customerSelfCancelBlockedMessage:
        typeof body.customerSelfCancelBlockedMessage === 'string' ? body.customerSelfCancelBlockedMessage : '',
      multipleFees: Array.isArray(body.multipleFees) ? body.multipleFees : undefined,
    };

    const { data: existing } = await supabase
      .from('business_cancellation_settings')
      .select('id')
      .eq('business_id', businessId)
      .maybeSingle();

    const payload = {
      settings,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from('business_cancellation_settings')
        .update(payload)
        .eq('business_id', businessId)
        .select('settings')
        .single();

      if (error) {
        console.error('Cancellation settings update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ settings: data.settings });
    }

    const { data, error } = await supabase
      .from('business_cancellation_settings')
      .insert({ business_id: businessId, ...payload })
      .select('settings')
      .single();

    if (error) {
      console.error('Cancellation settings insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ settings: data.settings });
  } catch (e) {
    console.error('Cancellation settings PUT:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
