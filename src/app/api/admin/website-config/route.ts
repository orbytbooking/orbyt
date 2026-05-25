import { NextRequest, NextResponse } from 'next/server';
import { requireAdminTenantContext } from '@/lib/adminTenantContext';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const { data: config, error: configError } = await supabase
      .from('business_website_configs')
      .select('config')
      .eq('business_id', businessId)
      .single();

    if (configError && configError.code !== 'PGRST116') {
      return NextResponse.json({ error: configError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      config: config?.config || null
    });

  } catch (error) {
    console.error('Website config GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const { config } = await request.json();

    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: 'Invalid config data' }, { status: 400 });
    }

    // Use upsert with on_conflict to handle duplicate key
    const { data: result, error: upsertError } = await supabase
      .from('business_website_configs')
      .upsert({
        business_id: businessId,
        config: config,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'business_id'
      })
      .select('config')
      .single();

    if (upsertError) {
      console.error('Website config upsert error:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      config: result.config
    });

  } catch (error) {
    console.error('Website config POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
