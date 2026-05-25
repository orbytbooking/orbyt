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
    const { supabase: supabaseAdmin, businessId } = ctx;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      (typeof body.businessId === 'string' ? body.businessId.trim() : '') ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { name, display_order } = body as {
      name?: unknown;
      display_order?: unknown;
      businessId?: string;
    };

    const payload: { name?: string; display_order?: number; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined && name !== null) payload.name = String(name).trim();
    if (typeof display_order === 'number') payload.display_order = display_order;

    const { data: tag, error } = await supabaseAdmin
      .from('general_tags')
      .update(payload)
      .eq('id', decodeURIComponent(id))
      .eq('business_id', businessId)
      .select('id, name, display_order')
      .single();

    if (error) {
      console.error('Error updating tag:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update tag' },
        { status: 500 }
      );
    }
    return NextResponse.json({ tag });
  } catch (error: unknown) {
    console.error('Unexpected error in PATCH /api/admin/tags/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase: supabaseAdmin, businessId } = ctx;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      request.nextUrl.searchParams.get('businessId')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { error } = await supabaseAdmin
      .from('general_tags')
      .delete()
      .eq('id', decodeURIComponent(id))
      .eq('business_id', businessId);

    if (error) {
      console.error('Error deleting tag:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete tag' },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Unexpected error in DELETE /api/admin/tags/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
