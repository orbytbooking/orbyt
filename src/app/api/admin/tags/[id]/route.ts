import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }
    const body = await request.json();
    const { name, display_order } = body;

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const payload: { name?: string; display_order?: number; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined && name !== null) payload.name = String(name).trim();
    if (typeof display_order === 'number') payload.display_order = display_order;

    const { data: tag, error } = await supabaseAdmin
      .from('general_tags')
      .update(payload)
      .eq('id', decodeURIComponent(id))
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
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { error } = await supabaseAdmin
      .from('general_tags')
      .delete()
      .eq('id', decodeURIComponent(id));

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
