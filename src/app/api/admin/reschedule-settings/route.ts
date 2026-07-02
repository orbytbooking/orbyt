import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
  type ServiceSupabase,
} from '@/lib/adminTenantContext';

export interface RescheduleSettingsPayload {
  chargeFee?: 'yes' | 'no';
  feeAmount?: string;
  feeType?: '$' | '%';
  overrideServiceCategory?: boolean;
  considerDate?: boolean;
  considerTime?: boolean;
  considerAnyChanges?: boolean;
  chargeWhen?: 'after_time_day_before' | 'hours_before';
  afterTime?: string;
  afterAmPm?: 'AM' | 'PM';
  hoursBefore?: string;
  excludeSameDay?: boolean;
  chargeMultipleFeesOneDay?: boolean;
  chargeFeeOnPostpone?: boolean;
}

type RescheduleSettingsRow = {
  id?: string;
  settings?: RescheduleSettingsPayload;
};

type RescheduleSettingsDbClient = {
  from(table: 'business_reschedule_settings'): {
    select(cols: string): {
      eq(col: string, val: string): {
        maybeSingle(): Promise<{ data: RescheduleSettingsRow | null; error: { message: string } | null }>;
        single(): Promise<{ data: RescheduleSettingsRow | null; error: { message: string } | null }>;
      };
    };
    update(values: { settings: RescheduleSettingsPayload; updated_at: string }): {
      eq(col: string, val: string): {
        select(cols: string): {
          single(): Promise<{ data: RescheduleSettingsRow | null; error: { message: string } | null }>;
        };
      };
    };
    insert(values: { business_id: string; settings: RescheduleSettingsPayload; updated_at: string }): {
      select(cols: string): {
        single(): Promise<{ data: RescheduleSettingsRow | null; error: { message: string } | null }>;
      };
    };
  };
};

function rescheduleSettingsDb(supabase: ServiceSupabase): RescheduleSettingsDbClient {
  return supabase as unknown as RescheduleSettingsDbClient;
}

const RESCHEDULE_SETTINGS_MIGRATION =
  'database/migrations/168_business_reschedule_settings.sql';

function rescheduleSettingsTableMissing(message: string): boolean {
  const m = message.toLowerCase();
  if (!m.includes('business_reschedule_settings')) return false;
  return m.includes('does not exist') || m.includes('schema cache') || m.includes('could not find');
}

function normalizeFeeType(value: unknown): '$' | '%' | undefined {
  if (value === '$' || value === '%') return value;
  return undefined;
}

function normalizeSettings(body: Record<string, unknown>): RescheduleSettingsPayload {
  const chargeFee = body.chargeFee === 'no' ? 'no' : (body.chargeFee === 'yes' ? 'yes' : 'no');
  const feeType = normalizeFeeType(body.feeType);
  const rawAmount = typeof body.feeAmount === 'string' ? body.feeAmount.trim() : String(body.feeAmount ?? '').trim();
  const parsedAmount = parseInt(rawAmount, 10);
  const feeAmount =
    chargeFee === 'yes' && feeType && Number.isInteger(parsedAmount) && parsedAmount > 0
      ? String(feeType === '%' ? Math.min(100, parsedAmount) : parsedAmount)
      : '';

  return {
    chargeFee,
    feeAmount,
    feeType: chargeFee === 'yes' && feeAmount ? feeType : undefined,
    overrideServiceCategory: !!body.overrideServiceCategory,
    considerDate: !!body.considerDate,
    considerTime: !!body.considerTime,
    considerAnyChanges: body.considerAnyChanges !== false,
    chargeWhen: body.chargeWhen === 'hours_before' ? 'hours_before' : 'after_time_day_before',
    afterTime: typeof body.afterTime === 'string' ? body.afterTime : '01:00',
    afterAmPm: body.afterAmPm === 'PM' ? 'PM' : 'AM',
    hoursBefore: typeof body.hoursBefore === 'string' ? body.hoursBefore : '1',
    excludeSameDay: !!body.excludeSameDay,
    chargeMultipleFeesOneDay: !!body.chargeMultipleFeesOneDay,
    chargeFeeOnPostpone: !!body.chargeFeeOnPostpone,
  };
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;
    const db = rescheduleSettingsDb(supabase);

    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      request.nextUrl.searchParams.get('businessId')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { data, error } = await db
      .from('business_reschedule_settings')
      .select('settings')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      if (rescheduleSettingsTableMissing(error.message || '')) {
        return NextResponse.json({
          settings: {},
          reschedule_settings_migration_required: true,
          migration_hint: RESCHEDULE_SETTINGS_MIGRATION,
        });
      }
      console.error('Reschedule settings fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings: RescheduleSettingsPayload =
      data?.settings && typeof data.settings === 'object' ? data.settings : {};
    return NextResponse.json({ settings });
  } catch (e) {
    console.error('Reschedule settings GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;
    const db = rescheduleSettingsDb(supabase);

    const body = await request.json();
    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      (typeof body.businessId === 'string' ? body.businessId.trim() : '') ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const settings = normalizeSettings(body as Record<string, unknown>);

    const { data: existing, error: existingError } = await db
      .from('business_reschedule_settings')
      .select('id')
      .eq('business_id', businessId)
      .maybeSingle();

    if (existingError && rescheduleSettingsTableMissing(existingError.message || '')) {
      return NextResponse.json({
        error: 'Reschedule settings table is missing. Run the database migration first.',
        reschedule_settings_migration_required: true,
        migration_hint: RESCHEDULE_SETTINGS_MIGRATION,
      }, { status: 503 });
    }

    if (existingError) {
      console.error('Reschedule settings lookup error:', existingError);
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const payload = {
      settings,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { data, error } = await db
        .from('business_reschedule_settings')
        .update(payload)
        .eq('business_id', businessId)
        .select('settings')
        .single();

      if (error) {
        if (rescheduleSettingsTableMissing(error.message || '')) {
          return NextResponse.json({
            error: 'Reschedule settings table is missing. Run the database migration first.',
            reschedule_settings_migration_required: true,
            migration_hint: RESCHEDULE_SETTINGS_MIGRATION,
          }, { status: 503 });
        }
        console.error('Reschedule settings update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data?.settings) {
        return NextResponse.json({ error: 'Failed to save reschedule settings' }, { status: 500 });
      }
      return NextResponse.json({ settings: data.settings });
    }

    const { data, error } = await db
      .from('business_reschedule_settings')
      .insert({ business_id: businessId, ...payload })
      .select('settings')
      .single();

    if (error) {
      if (rescheduleSettingsTableMissing(error.message || '')) {
        return NextResponse.json({
          error: 'Reschedule settings table is missing. Run the database migration first.',
          reschedule_settings_migration_required: true,
          migration_hint: RESCHEDULE_SETTINGS_MIGRATION,
        }, { status: 503 });
      }
      console.error('Reschedule settings insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data?.settings) {
      return NextResponse.json({ error: 'Failed to save reschedule settings' }, { status: 500 });
    }
    return NextResponse.json({ settings: data.settings });
  } catch (e) {
    console.error('Reschedule settings PUT:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
