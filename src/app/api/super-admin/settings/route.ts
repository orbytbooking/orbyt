import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminGate } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS = {
  platform_display_name: 'Orbyt Service Platform',
  support_email: 'support@orbyt.com',
  status_page_url: 'https://status.orbyt.com',
  maintenance_mode_enabled: false,
  enforce_admin_mfa: true,
  send_incident_alerts: true,
  send_weekly_digest: false,
  session_timeout_hours: 8,
};

export async function GET() {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin } = gate;

  const { data, error } = await admin
    .from('platform_settings')
    .select(
      'platform_display_name, support_email, status_page_url, maintenance_mode_enabled, enforce_admin_mfa, send_incident_alerts, send_weekly_digest, session_timeout_hours'
    )
    .eq('id', 1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data ?? DEFAULT_SETTINGS });
}

export async function PUT(request: NextRequest) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin } = gate;
  const body = await request.json().catch(() => ({}));

  const platform_display_name = String(body.platform_display_name ?? DEFAULT_SETTINGS.platform_display_name).trim();
  const support_email = String(body.support_email ?? DEFAULT_SETTINGS.support_email).trim();
  const status_page_url = String(body.status_page_url ?? DEFAULT_SETTINGS.status_page_url).trim();
  const maintenance_mode_enabled = body.maintenance_mode_enabled === true;
  const enforce_admin_mfa = body.enforce_admin_mfa !== false;
  const send_incident_alerts = body.send_incident_alerts !== false;
  const send_weekly_digest = body.send_weekly_digest === true;
  const session_timeout_hours = Number(body.session_timeout_hours ?? DEFAULT_SETTINGS.session_timeout_hours);

  if (!platform_display_name) {
    return NextResponse.json({ error: 'platform_display_name is required' }, { status: 400 });
  }
  if (!support_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(support_email)) {
    return NextResponse.json({ error: 'A valid support_email is required' }, { status: 400 });
  }
  if (status_page_url && !/^https?:\/\/.+/i.test(status_page_url)) {
    return NextResponse.json({ error: 'status_page_url must start with http:// or https://' }, { status: 400 });
  }
  if (!Number.isFinite(session_timeout_hours) || session_timeout_hours <= 0 || session_timeout_hours > 168) {
    return NextResponse.json({ error: 'session_timeout_hours must be between 1 and 168' }, { status: 400 });
  }

  const payload = {
    id: 1,
    platform_display_name,
    support_email,
    status_page_url,
    maintenance_mode_enabled,
    enforce_admin_mfa,
    send_incident_alerts,
    send_weekly_digest,
    session_timeout_hours: Math.round(session_timeout_hours),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from('platform_settings')
    .upsert(payload, { onConflict: 'id' })
    .select(
      'platform_display_name, support_email, status_page_url, maintenance_mode_enabled, enforce_admin_mfa, send_incident_alerts, send_weekly_digest, session_timeout_hours'
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ settings: data });
}
