import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEFAULT_PREFS = {
  emailBookings: true,
  emailCancellations: true,
  emailPayments: true,
  smsReminders: false,
  pushNotifications: true,
};

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const userRole = user.user_metadata?.role || 'owner';
    if (userRole === 'customer') return createForbiddenResponse('Customers cannot access admin endpoints');

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const { data: row, error: configError } = await supabase
      .from('business_website_configs')
      .select('config')
      .eq('business_id', business.id)
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
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const userRole = user.user_metadata?.role || 'owner';
    if (userRole === 'customer') return createForbiddenResponse('Customers cannot access admin endpoints');

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

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
      .eq('business_id', business.id)
      .single();

    const currentConfig = (existing?.config && typeof existing.config === 'object') ? existing.config as Record<string, unknown> : {};
    const newConfig = {
      ...currentConfig,
      adminNotificationPreferences: preferences,
    };

    const { error: upsertError } = await supabase
      .from('business_website_configs')
      .upsert({
        business_id: business.id,
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
