import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const businessId = request.headers.get('x-business-id') || request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from('business_spot_limits')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      console.error('Business spot limits fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const defaults = {
      max_bookings_per_day: 10,
      max_bookings_per_week: 50,
      max_bookings_per_month: 200,
      max_advance_booking_days: 90,
      enabled: true,
    };

    return NextResponse.json({ spotLimits: data ? { ...defaults, ...data } : defaults });
  } catch (e) {
    console.error('Business spot limits GET:', e);
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const update = {
      max_bookings_per_day: Math.max(1, Math.min(999, Number(body.max_bookings_per_day) || 10)),
      max_bookings_per_week: Math.max(1, Math.min(9999, Number(body.max_bookings_per_week) || 50)),
      max_bookings_per_month: Math.max(1, Math.min(99999, Number(body.max_bookings_per_month) || 200)),
      max_advance_booking_days: Math.max(1, Math.min(365, Number(body.max_advance_booking_days) || 90)),
      enabled: !!body.enabled,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from('business_spot_limits')
      .select('id')
      .eq('business_id', businessId)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabase
        .from('business_spot_limits')
        .update(update)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        console.error('Business spot limits update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ spotLimits: data });
    }

    const { data, error } = await supabase
      .from('business_spot_limits')
      .insert({ business_id: businessId, ...update })
      .select()
      .single();

    if (error) {
      console.error('Business spot limits insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ spotLimits: data });
  } catch (e) {
    console.error('Business spot limits PUT:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
