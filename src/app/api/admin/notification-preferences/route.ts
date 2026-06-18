import { NextRequest, NextResponse } from 'next/server';
import { requireAdminTenantContext } from '@/lib/adminTenantContext';
import {
  DEFAULT_ADMIN_NOTIFICATION_PREFERENCES,
  mergeAdminNotificationPreferences,
  readStoredPreferences,
} from '@/lib/adminNotificationPreferences';

async function savePreferences(request: NextRequest) {
  const ctx = await requireAdminTenantContext(request);
  if (ctx instanceof NextResponse) return ctx;
  const { supabase, businessId } = ctx;

  const body = (await request.json()) as Record<string, unknown>;

  const { data: existing } = await supabase
    .from('business_website_configs')
    .select('config')
    .eq('business_id', businessId)
    .single();

  const currentConfig =
    existing?.config && typeof existing.config === 'object'
      ? (existing.config as Record<string, unknown>)
      : {};
  const prev = readStoredPreferences(currentConfig);
  const preferences = mergeAdminNotificationPreferences(prev, body);

  const newConfig = {
    ...currentConfig,
    adminNotificationPreferences: preferences,
  };

  const { error: upsertError } = await supabase.from('business_website_configs').upsert(
    {
      business_id: businessId,
      config: newConfig,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_id' },
  );

  if (upsertError) {
    console.error('Notification preferences save error:', upsertError);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, preferences });
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const { data: row, error: configError } = await supabase
      .from('business_website_configs')
      .select('config')
      .eq('business_id', businessId)
      .single();

    if (configError && configError.code !== 'PGRST116') {
      return NextResponse.json({ error: configError.message }, { status: 500 });
    }

    const preferences = row?.config
      ? readStoredPreferences(row.config)
      : { ...DEFAULT_ADMIN_NOTIFICATION_PREFERENCES };

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Notification preferences GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await savePreferences(request);
  } catch (error) {
    console.error('Notification preferences PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    return await savePreferences(request);
  } catch (error) {
    console.error('Notification preferences PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
