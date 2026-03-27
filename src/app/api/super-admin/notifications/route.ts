import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminGate } from '@/lib/auth-helpers';
import {
  SUPPORT_NOTIF_ID_PREFIX,
  getPlatformOnlyNotificationsForUser,
  markAllVisiblePlatformAnnouncementsReadForUser,
  type MergedNotificationRow,
} from '@/lib/platform-announcement-notifications';

export const dynamic = 'force-dynamic';

function ticketIsHandledStatus(status: string | null | undefined): boolean {
  const s = (status || '').toLowerCase();
  return s === 'resolved' || s === 'closed';
}

/** Platform announcements (all audiences) + support tickets. Query: source=all|platform|support, read=all|unread|read, ticket_limit=1–500 (default 40 for bell). */
export async function GET(request: NextRequest) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;
  const { user, admin } = gate;

  const { searchParams } = new URL(request.url);
  const sourceRaw = (searchParams.get('source') || 'all').toLowerCase();
  const source = ['all', 'platform', 'support'].includes(sourceRaw) ? sourceRaw : 'all';
  const readRaw = (searchParams.get('read') || 'all').toLowerCase();
  const readFilter = ['all', 'unread', 'read'].includes(readRaw) ? readRaw : 'all';
  const ticketLimitParam = searchParams.get('ticket_limit');
  const ticketLimit =
    ticketLimitParam == null
      ? 40
      : Math.min(500, Math.max(1, parseInt(ticketLimitParam, 10) || 40));

  const platform = await getPlatformOnlyNotificationsForUser(admin, user.id, 'super_admin');

  let supportRows: MergedNotificationRow[] = [];
  try {
    const { data: businesses } = await admin.from('businesses').select('id, name');
    const nameById = Object.fromEntries(
      (businesses ?? []).map((b: { id: string; name: string }) => [b.id, b.name])
    );
    const { data: tickets } = await admin
      .from('support_tickets')
      .select('id, business_id, subject, priority, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(ticketLimit);

    supportRows = (tickets ?? []).map(
      (t: {
        id: string;
        business_id: string;
        subject: string;
        priority: string;
        status: string;
        created_at: string | null;
        updated_at: string | null;
      }) => {
        const st = (t.status || '').replace(/_/g, ' ');
        return {
          id: `${SUPPORT_NOTIF_ID_PREFIX}${t.id}`,
          title: `Support: ${t.subject}`,
          description: `${nameById[t.business_id] ?? '—'} · ${t.priority} · ${st}`,
          read: ticketIsHandledStatus(t.status),
          created_at: t.updated_at || t.created_at || new Date().toISOString(),
          link: null,
          source: 'support' as const,
        };
      }
    );
  } catch (e) {
    console.warn('Super admin notifications: support_tickets load skipped', e);
  }

  let combined = [...platform, ...supportRows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (source === 'platform') combined = combined.filter((n) => n.source === 'platform');
  else if (source === 'support') combined = combined.filter((n) => n.source === 'support');

  if (readFilter === 'unread') combined = combined.filter((n) => !n.read);
  else if (readFilter === 'read') combined = combined.filter((n) => n.read);

  const mapped = combined.map((n) => ({
    id: n.id,
    title: n.title,
    description: n.description,
    read: n.read,
    created_at: n.created_at,
    link: n.link,
    source: n.source,
    level: n.level ?? null,
    audience: n.audience ?? null,
  }));

  return NextResponse.json({ notifications: mapped });
}

export async function PATCH() {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;
  const { user, admin } = gate;

  await markAllVisiblePlatformAnnouncementsReadForUser(admin, user.id, 'super_admin');
  return NextResponse.json({ ok: true });
}
