import { NextRequest, NextResponse } from 'next/server';
import { requireAdminTenantContext } from '@/lib/adminTenantContext';

const DEFAULT_PREFS = {
  emailBookings: true,
  emailCancellations: true,
  emailPayments: true,
  smsReminders: false,
  pushNotifications: true,
};

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

    const prefs = (row?.config && typeof row.config === 'object' && (row.config as any).adminNotificationPreferences)
      ? { ...DEFAULT_PREFS, ...(row.config as any).adminNotificationPreferences }
      : DEFAULT_PREFS;

    return NextResponse.json({ preferences: prefs });
  } catch (error) {
    console.error('Notification preferences GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const body = await request.json();
    const preferences = {
      emailBookings: typeof body.emailBookings === 'boolean' ? body.emailBookings : true,
      emailCancellations: typeof body.emailCancellations === 'boolean' ? body.emailCancellations : true,
      emailPayments: typeof body.emailPayments === 'boolean' ? body.emailPayments : true,
      smsReminders: typeof body.smsReminders === 'boolean' ? body.smsReminders : false,
      pushNotifications: typeof body.pushNotifications === 'boolean' ? body.pushNotifications : true,
    };

    const { data: existing } = await supabase
      .from('business_website_configs')
      .select('config')
      .eq('business_id', businessId)
      .single();

    const currentConfig = (existing?.config && typeof existing.config === 'object') ? existing.config as Record<string, unknown> : {};
    const newConfig = {
      ...currentConfig,
      adminNotificationPreferences: preferences,
    };

    const { error: upsertError } = await supabase
      .from('business_website_configs')
      .upsert({
        business_id: businessId,
        config: newConfig,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'business_id' });

    if (upsertError) {
      console.error('Notification preferences PUT error:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    console.error('Notification preferences PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
