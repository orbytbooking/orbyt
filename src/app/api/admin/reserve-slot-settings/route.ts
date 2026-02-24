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
      .from('business_reserve_slot_settings')
      .select('maximum_by_day, quick_add_spots')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      console.error('Reserve slot settings fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      maximumByDay: data?.maximum_by_day ?? {},
      quickAddSpots: Array.isArray(data?.quick_add_spots) ? data.quick_add_spots : [],
    });
  } catch (e) {
    console.error('Reserve slot settings GET:', e);
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

    const maximumByDay = body.maximumByDay && typeof body.maximumByDay === 'object' ? body.maximumByDay : {};
    const quickAddSpots = Array.isArray(body.quickAddSpots) ? body.quickAddSpots : [];

    const { data: existing } = await supabase
      .from('business_reserve_slot_settings')
      .select('id')
      .eq('business_id', businessId)
      .maybeSingle();

    const payload = {
      maximum_by_day: maximumByDay,
      quick_add_spots: quickAddSpots,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from('business_reserve_slot_settings')
        .update(payload)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        console.error('Reserve slot settings update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ maximumByDay: data.maximum_by_day, quickAddSpots: data.quick_add_spots });
    }

    const { data, error } = await supabase
      .from('business_reserve_slot_settings')
      .insert({ business_id: businessId, ...payload })
      .select()
      .single();

    if (error) {
      console.error('Reserve slot settings insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ maximumByDay: data.maximum_by_day, quickAddSpots: data.quick_add_spots });
  } catch (e) {
    console.error('Reserve slot settings PUT:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
