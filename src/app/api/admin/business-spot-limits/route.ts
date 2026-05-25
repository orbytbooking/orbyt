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
