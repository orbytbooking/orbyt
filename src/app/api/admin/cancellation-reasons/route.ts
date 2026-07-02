import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';

export type CancellationReasonRow = {
  id: string;
  label: string;
  display_order: number;
  is_active: boolean;
  applies_one_time: boolean;
  applies_recurring: boolean;
  applicable_cancel_all_recurring: boolean;
  applicable_cancel_single: boolean;
  applicable_exclude_cancellation_fee: boolean;
  applicable_exclude_after_first_fee: boolean;
};

const REASON_SELECT =
  'id, label, display_order, is_active, applies_one_time, applies_recurring, applicable_cancel_all_recurring, applicable_cancel_single, applicable_exclude_cancellation_fee, applicable_exclude_after_first_fee';

function mapRow(row: {
  id: string;
  label: string;
  display_order: number;
  is_active: boolean;
  applies_one_time: boolean;
  applies_recurring: boolean;
  applicable_cancel_all_recurring?: boolean;
  applicable_cancel_single?: boolean;
  applicable_exclude_cancellation_fee?: boolean;
  applicable_exclude_after_first_fee?: boolean;
}): CancellationReasonRow {
  return {
    id: row.id,
    label: row.label,
    display_order: row.display_order,
    is_active: row.is_active,
    applies_one_time: row.applies_one_time,
    applies_recurring: row.applies_recurring,
    applicable_cancel_all_recurring: !!row.applicable_cancel_all_recurring,
    applicable_cancel_single: !!row.applicable_cancel_single,
    applicable_exclude_cancellation_fee: !!row.applicable_exclude_cancellation_fee,
    applicable_exclude_after_first_fee: !!row.applicable_exclude_after_first_fee,
  };
}

function parseApplicableFields(body: Record<string, unknown>) {
  return {
    applies_one_time: body.applies_one_time !== false,
    applies_recurring: body.applies_recurring !== false,
    applicable_cancel_all_recurring: !!body.applicable_cancel_all_recurring,
    applicable_cancel_single: !!body.applicable_cancel_single,
    applicable_exclude_cancellation_fee: !!body.applicable_exclude_cancellation_fee,
    applicable_exclude_after_first_fee: !!body.applicable_exclude_after_first_fee,
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
      .from('cancellation_reasons')
      .select(REASON_SELECT)
      .eq('business_id', businessId)
      .order('display_order', { ascending: true })
      .order('label', { ascending: true });

    if (error) {
      if (error.message?.includes('cancellation_reasons') && error.message?.includes('does not exist')) {
        return NextResponse.json(
          {
            error:
              'Cancellation reasons table missing. Run database migration 162_cancellation_reasons.sql on your database.',
            code: 'TABLE_MISSING',
          },
          { status: 500 }
        );
      }
      console.error('admin/cancellation-reasons GET:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reasons: (data || []).map(mapRow) });
  } catch (e) {
    console.error('admin/cancellation-reasons GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      (typeof body.businessId === 'string' ? body.businessId.trim() : '') ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const label = typeof body.label === 'string' ? body.label.trim() : '';
    if (!label) {
      return NextResponse.json({ error: 'label is required' }, { status: 400 });
    }

    const { data: maxRow } = await supabase
      .from('cancellation_reasons')
      .select('display_order')
      .eq('business_id', businessId)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder =
      typeof maxRow?.display_order === 'number' && Number.isFinite(maxRow.display_order)
        ? maxRow.display_order + 1
        : 0;

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('cancellation_reasons')
      .insert({
        business_id: businessId,
        label,
        display_order: nextOrder,
        is_active: body.is_active !== false,
        ...parseApplicableFields(body),
        created_at: now,
        updated_at: now,
      })
      .select(REASON_SELECT)
      .single();

    if (error) {
      console.error('admin/cancellation-reasons POST:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reason: mapRow(data) });
  } catch (e) {
    console.error('admin/cancellation-reasons POST:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Bulk save reason fields or reorder: { reasons?: [...] } or { orderedIds?: string[] } */
export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    let body: { reasons?: unknown; orderedIds?: unknown; businessId?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      (typeof body.businessId === 'string' ? body.businessId.trim() : '') ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const now = new Date().toISOString();

    if (Array.isArray(body.orderedIds)) {
      const orderedIds = body.orderedIds.filter(
        (id): id is string => typeof id === 'string' && id.trim() !== ''
      );
      if (orderedIds.length === 0) {
        return NextResponse.json({ error: 'orderedIds must be a non-empty array' }, { status: 400 });
      }
      if (new Set(orderedIds).size !== orderedIds.length) {
        return NextResponse.json({ error: 'orderedIds must not contain duplicates' }, { status: 400 });
      }

      const { data: existing, error: listErr } = await supabase
        .from('cancellation_reasons')
        .select('id')
        .eq('business_id', businessId);

      if (listErr) {
        console.error('admin/cancellation-reasons PUT list:', listErr);
        return NextResponse.json({ error: listErr.message }, { status: 500 });
      }

      const existingSet = new Set((existing || []).map((r: { id: string }) => r.id));
      if (existingSet.size !== orderedIds.length) {
        return NextResponse.json(
          { error: 'orderedIds must include every cancellation reason for this business' },
          { status: 400 }
        );
      }
      for (const id of orderedIds) {
        if (!existingSet.has(id)) {
          return NextResponse.json({ error: 'Invalid reason id in orderedIds' }, { status: 400 });
        }
      }

      for (let i = 0; i < orderedIds.length; i++) {
        const { error: upErr } = await supabase
          .from('cancellation_reasons')
          .update({ display_order: i, updated_at: now })
          .eq('id', orderedIds[i])
          .eq('business_id', businessId);
        if (upErr) {
          console.error('admin/cancellation-reasons PUT reorder:', upErr);
          return NextResponse.json({ error: upErr.message }, { status: 500 });
        }
      }
    } else if (Array.isArray(body.reasons)) {
      for (const item of body.reasons) {
        if (!item || typeof item !== 'object') continue;
        const row = item as Record<string, unknown>;
        const id = typeof row.id === 'string' ? row.id.trim() : '';
        if (!id) continue;

        const payload: Record<string, unknown> = { updated_at: now };
        if (typeof row.label === 'string' && row.label.trim()) payload.label = row.label.trim();
        if (typeof row.is_active === 'boolean') payload.is_active = row.is_active;
        if (typeof row.applies_one_time === 'boolean') payload.applies_one_time = row.applies_one_time;
        if (typeof row.applies_recurring === 'boolean') payload.applies_recurring = row.applies_recurring;
        if (typeof row.applicable_cancel_all_recurring === 'boolean') {
          payload.applicable_cancel_all_recurring = row.applicable_cancel_all_recurring;
        }
        if (typeof row.applicable_cancel_single === 'boolean') {
          payload.applicable_cancel_single = row.applicable_cancel_single;
        }
        if (typeof row.applicable_exclude_cancellation_fee === 'boolean') {
          payload.applicable_exclude_cancellation_fee = row.applicable_exclude_cancellation_fee;
        }
        if (typeof row.applicable_exclude_after_first_fee === 'boolean') {
          payload.applicable_exclude_after_first_fee = row.applicable_exclude_after_first_fee;
        }

        const { error: upErr } = await supabase
          .from('cancellation_reasons')
          .update(payload)
          .eq('id', id)
          .eq('business_id', businessId);
        if (upErr) {
          console.error('admin/cancellation-reasons PUT bulk:', upErr);
          return NextResponse.json({ error: upErr.message }, { status: 500 });
        }
      }
    } else {
      return NextResponse.json({ error: 'Provide reasons or orderedIds' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('cancellation_reasons')
      .select(REASON_SELECT)
      .eq('business_id', businessId)
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reasons: (data || []).map(mapRow) });
  } catch (e) {
    console.error('admin/cancellation-reasons PUT:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
