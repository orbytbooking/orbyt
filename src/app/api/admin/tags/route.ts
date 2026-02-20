import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

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
    const body = await request.json();
    const { businessId, name, display_order } = body;

    if (!businessId || name === undefined || name === null) {
      return NextResponse.json(
        { error: 'Business ID and name are required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

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
