import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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
  multipleFees?: Array<{
    id: string;
    fee: string;
    currency: string;
    chargeTiming: 'beforeDay' | 'hoursBefore';
    beforeDayTime?: string;
    hoursBefore: string;
  }>;
}

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
    const body = await request.json();
    const businessId = request.headers.get('x-business-id') || body.businessId;
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

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
      multipleFees: Array.isArray(body.multipleFees) ? body.multipleFees : undefined,
    };

    const supabase = await getSupabase();
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
