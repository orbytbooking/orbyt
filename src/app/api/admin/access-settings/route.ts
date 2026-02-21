import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_CUSTOMER_MESSAGE = 'We apologize for the inconvenience. Please contact our office if you have any questions.';
const DEFAULT_PROVIDER_MESSAGE = 'We apologize for the inconvenience. Please contact our office if you have any questions.';

export interface AccessSettings {
  customer_blocked_message: string;
  provider_deactivated_message: string;
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
      .from('business_access_settings')
      .select('customer_blocked_message, provider_deactivated_message')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      console.error('Access settings fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings: AccessSettings = {
      customer_blocked_message: data?.customer_blocked_message ?? DEFAULT_CUSTOMER_MESSAGE,
      provider_deactivated_message: data?.provider_deactivated_message ?? DEFAULT_PROVIDER_MESSAGE,
    };

    return NextResponse.json({ settings });
  } catch (e) {
    console.error('Access settings GET:', e);
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

    const customer_blocked_message =
      typeof body.customer_blocked_message === 'string'
        ? body.customer_blocked_message
        : DEFAULT_CUSTOMER_MESSAGE;
    const provider_deactivated_message =
      typeof body.provider_deactivated_message === 'string'
        ? body.provider_deactivated_message
        : DEFAULT_PROVIDER_MESSAGE;

    const supabase = await getSupabase();
    const { data: existing } = await supabase
      .from('business_access_settings')
      .select('id')
      .eq('business_id', businessId)
      .maybeSingle();

    const payload = {
      customer_blocked_message,
      provider_deactivated_message,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from('business_access_settings')
        .update(payload)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        console.error('Access settings update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ settings: { customer_blocked_message: data.customer_blocked_message, provider_deactivated_message: data.provider_deactivated_message } });
    }

    const { data, error } = await supabase
      .from('business_access_settings')
      .insert({ business_id: businessId, ...payload })
      .select()
      .single();

    if (error) {
      console.error('Access settings insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ settings: { customer_blocked_message: data.customer_blocked_message, provider_deactivated_message: data.provider_deactivated_message } });
  } catch (e) {
    console.error('Access settings PUT:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
