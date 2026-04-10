import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase: supabaseAdmin, businessId } = ctx;

    const { searchParams } = new URL(request.url);
    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      searchParams.get('businessId')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { data: tags, error } = await supabaseAdmin
      .from('general_tags')
      .select('id, name, display_order')
      .eq('business_id', businessId)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching admin tags:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch tags' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tags: tags || [] });
  } catch (error: unknown) {
    console.error('Unexpected error in GET /api/admin/tags:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase: supabaseAdmin, businessId } = ctx;

    const body = await request.json();
    const { name, display_order } = body;

    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      (typeof body.businessId === 'string' ? body.businessId.trim() : '') ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    if (name === undefined || name === null) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const displayOrder = typeof display_order === 'number' ? display_order : 0;

    const { data: tag, error } = await supabaseAdmin
      .from('general_tags')
      .insert({
        business_id: businessId,
        name: String(name).trim(),
        display_order: displayOrder,
        updated_at: new Date().toISOString(),
      })
      .select('id, name, display_order')
      .single();

    if (error) {
      console.error('Error creating admin tag:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create tag' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tag });
  } catch (error: unknown) {
    console.error('Unexpected error in POST /api/admin/tags:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
