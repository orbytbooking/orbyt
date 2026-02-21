import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export type SchedulingType = 'accepted_automatically' | 'accept_or_decline' | 'accepts_same_day_only';

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
}

const DEFAULT_OPTIONS: Omit<BusinessStoreOptions, 'id' | 'business_id'> = {
  scheduling_type: 'accepted_automatically',
  accept_decline_timeout_minutes: 60,
  providers_can_see_unassigned: true,
  providers_can_see_all_unassigned: false,
  notify_providers_on_unassigned: true,
  waitlist_enabled: false,
  clock_in_out_enabled: false,
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
