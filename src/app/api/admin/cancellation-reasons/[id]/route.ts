import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Reason ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      (typeof body.businessId === 'string' ? body.businessId.trim() : '') ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.label === 'string' && body.label.trim()) payload.label = body.label.trim();
    if (typeof body.is_active === 'boolean') payload.is_active = body.is_active;
    if (typeof body.applies_one_time === 'boolean') payload.applies_one_time = body.applies_one_time;
    if (typeof body.applies_recurring === 'boolean') payload.applies_recurring = body.applies_recurring;
    if (typeof body.applicable_cancel_all_recurring === 'boolean') {
      payload.applicable_cancel_all_recurring = body.applicable_cancel_all_recurring;
    }
    if (typeof body.applicable_cancel_single === 'boolean') {
      payload.applicable_cancel_single = body.applicable_cancel_single;
    }
    if (typeof body.applicable_exclude_cancellation_fee === 'boolean') {
      payload.applicable_exclude_cancellation_fee = body.applicable_exclude_cancellation_fee;
    }
    if (typeof body.applicable_exclude_after_first_fee === 'boolean') {
      payload.applicable_exclude_after_first_fee = body.applicable_exclude_after_first_fee;
    }
    if (typeof body.display_order === 'number') payload.display_order = body.display_order;

    const { data, error } = await supabase
      .from('cancellation_reasons')
      .update(payload)
      .eq('id', decodeURIComponent(id))
      .eq('business_id', businessId)
      .select(
        'id, label, display_order, is_active, applies_one_time, applies_recurring, applicable_cancel_all_recurring, applicable_cancel_single, applicable_exclude_cancellation_fee, applicable_exclude_after_first_fee'
      )
      .single();

    if (error) {
      console.error('admin/cancellation-reasons PATCH:', error);
      return NextResponse.json({ error: error.message || 'Failed to update reason' }, { status: 500 });
    }

    return NextResponse.json({ reason: data });
  } catch (e) {
    console.error('admin/cancellation-reasons PATCH:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Reason ID is required' }, { status: 400 });
    }

    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      request.nextUrl.searchParams.get('businessId')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { error } = await supabase
      .from('cancellation_reasons')
      .delete()
      .eq('id', decodeURIComponent(id))
      .eq('business_id', businessId);

    if (error) {
      console.error('admin/cancellation-reasons DELETE:', error);
      return NextResponse.json({ error: error.message || 'Failed to delete reason' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('admin/cancellation-reasons DELETE:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
