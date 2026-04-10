import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';

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
