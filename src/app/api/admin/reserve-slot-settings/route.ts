import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';

function sanitizeExtendedSettings(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object') return {};
  const o = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (Array.isArray(o.dailySettings)) out.dailySettings = o.dailySettings;
  if (Array.isArray(o.slots)) out.slots = o.slots;
  if (o.bookingSpots && typeof o.bookingSpots === 'object') out.bookingSpots = o.bookingSpots;
  return out;
}

function formatExtendedFromRow(extended_settings: unknown) {
  const ext =
    extended_settings && typeof extended_settings === 'object'
      ? (extended_settings as Record<string, unknown>)
      : {};
  return {
    dailySettings: Array.isArray(ext.dailySettings) ? ext.dailySettings : [],
    slots: Array.isArray(ext.slots) ? ext.slots : [],
    bookingSpots:
      ext.bookingSpots && typeof ext.bookingSpots === 'object' ? ext.bookingSpots : { locations: [] },
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
      .from('business_reserve_slot_settings')
      .select('maximum_by_day, quick_add_spots, extended_settings')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      console.error('Reserve slot settings fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      maximumByDay: data?.maximum_by_day ?? {},
      quickAddSpots: Array.isArray(data?.quick_add_spots) ? data.quick_add_spots : [],
      extendedSettings: formatExtendedFromRow(data?.extended_settings),
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
    const hasExtended =
      body.extendedSettings !== undefined && body.extendedSettings !== null && typeof body.extendedSettings === 'object';

    const { data: existing } = await supabase
      .from('business_reserve_slot_settings')
      .select('id, extended_settings')
      .eq('business_id', businessId)
      .maybeSingle();

    const prevExt =
      existing?.extended_settings && typeof existing.extended_settings === 'object'
        ? (existing.extended_settings as Record<string, unknown>)
        : {};
    const extendedPatch = hasExtended ? sanitizeExtendedSettings(body.extendedSettings) : {};
    const extended_settings = hasExtended ? { ...prevExt, ...extendedPatch } : prevExt;

    const payload: Record<string, unknown> = {
      maximum_by_day: maximumByDay,
      quick_add_spots: quickAddSpots,
      updated_at: new Date().toISOString(),
    };
    if (hasExtended || !existing?.id) {
      payload.extended_settings = hasExtended ? extended_settings : {};
    }

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
      return NextResponse.json({
        maximumByDay: data.maximum_by_day,
        quickAddSpots: data.quick_add_spots,
        extendedSettings: formatExtendedFromRow(data.extended_settings),
      });
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
    return NextResponse.json({
      maximumByDay: data.maximum_by_day,
      quickAddSpots: data.quick_add_spots,
      extendedSettings: formatExtendedFromRow(data.extended_settings),
    });
  } catch (e) {
    console.error('Reserve slot settings PUT:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
