import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

/** Synthetic notification id prefix for platform announcements (merged into bell UIs). */
export const PLATFORM_NOTIF_ID_PREFIX = 'pa_';

/** Super Admin bell: synthetic id for support ticket rows (`st_` + ticket UUID). */
export const SUPPORT_NOTIF_ID_PREFIX = 'st_';

export function parseSupportNotificationId(id: string): string | null {
  if (!id.startsWith(SUPPORT_NOTIF_ID_PREFIX)) return null;
  const uuid = id.slice(SUPPORT_NOTIF_ID_PREFIX.length);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) return null;
  return uuid;
}

export type PlatformViewerKind = 'anonymous' | 'owners' | 'providers' | 'customers' | 'super_admin';

export function platformViewerKindFromUser(user: User | null): PlatformViewerKind {
  if (!user) return 'anonymous';
  const role = String(user.user_metadata?.role ?? 'owner').toLowerCase();
  if (role === 'customer') return 'customers';
  if (role === 'provider') return 'providers';
  return 'owners';
}

export function platformAnnouncementVisibleToViewer(
  audience: string | null | undefined,
  viewer: PlatformViewerKind
): boolean {
  if (viewer === 'super_admin') return true;
  const a = (audience || 'all').toLowerCase();
  const valid = ['all', 'owners', 'providers', 'customers'];
  const aud = valid.includes(a) ? a : 'all';
  if (aud === 'all') return true;
  if (viewer === 'anonymous') return false;
  return aud === viewer;
}

export function parsePlatformNotificationId(id: string): string | null {
  if (!id.startsWith(PLATFORM_NOTIF_ID_PREFIX)) return null;
  const uuid = id.slice(PLATFORM_NOTIF_ID_PREFIX.length);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) return null;
  return uuid;
}

export function toPlatformNotificationId(announcementId: string): string {
  return `${PLATFORM_NOTIF_ID_PREFIX}${announcementId}`;
}

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  audience: string | null;
  level: string;
  created_at: string;
};

/**
 * Active platform announcements visible to this viewer (date window + audience), newest first.
 */
export async function listActivePlatformAnnouncementsForViewer(
  supabase: SupabaseClient,
  viewer: PlatformViewerKind
): Promise<AnnouncementRow[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('platform_announcements')
    .select('id, title, body, audience, level, starts_at, ends_at, created_at')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return (data ?? [])
    .filter((row) => platformAnnouncementVisibleToViewer(row.audience, viewer))
    .map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      audience: row.audience ?? null,
      level: String(row.level ?? 'info'),
      created_at: row.created_at ?? new Date().toISOString(),
    }));
}

export async function getReadAnnouncementIdsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('user_platform_announcement_reads')
    .select('announcement_id')
    .eq('user_id', userId);

  if (error) throw error;
  return new Set((data ?? []).map((r) => (r as { announcement_id: string }).announcement_id));
}

export async function markPlatformAnnouncementReadForUser(
  supabase: SupabaseClient,
  userId: string,
  announcementId: string
): Promise<void> {
  const { error } = await supabase.from('user_platform_announcement_reads').insert({
    user_id: userId,
    announcement_id: announcementId,
    read_at: new Date().toISOString(),
  });
  if (error && (error as { code?: string }).code !== '23505') throw error;
}

export async function markAllVisiblePlatformAnnouncementsReadForUser(
  supabase: SupabaseClient,
  userId: string,
  viewer: PlatformViewerKind
): Promise<void> {
  const visible = await listActivePlatformAnnouncementsForViewer(supabase, viewer);
  const read = await getReadAnnouncementIdsForUser(supabase, userId);
  const toMark = visible.filter((a) => !read.has(a.id));
  await Promise.all(
    toMark.map((a) => markPlatformAnnouncementReadForUser(supabase, userId, a.id))
  );
}

export type MergedNotificationRow = {
  id: string;
  title: string;
  description: string;
  read: boolean;
  created_at: string;
  link: string | null;
  source: 'admin' | 'platform' | 'support';
  /** Platform announcements only */
  level?: string | null;
  audience?: string | null;
};

/**
 * Merge admin_notifications rows with unread platform announcements for the bell UI.
 */
export async function mergeAdminNotificationsWithPlatformAnnouncements(
  supabase: SupabaseClient,
  userId: string,
  viewer: PlatformViewerKind,
  adminRows: Array<{
    id: string;
    title: string;
    description: string | null;
    read: boolean | null;
    created_at: string | null;
    link?: string | null;
  }>
): Promise<MergedNotificationRow[]> {
  const visible = await listActivePlatformAnnouncementsForViewer(supabase, viewer);
  const readIds = await getReadAnnouncementIdsForUser(supabase, userId);

  const platformItems: MergedNotificationRow[] = visible.map((a) => ({
    id: toPlatformNotificationId(a.id),
    title: a.title,
    description: a.body ?? '',
    read: readIds.has(a.id),
    created_at: a.created_at,
    link: null,
    source: 'platform' as const,
    level: a.level,
    audience: a.audience,
  }));

  const adminItems: MergedNotificationRow[] = adminRows.map((n) => ({
    id: n.id,
    title: n.title,
    description: n.description ?? '',
    read: !!n.read,
    created_at: n.created_at ?? new Date().toISOString(),
    link: typeof n.link === 'string' ? n.link : null,
    source: 'admin' as const,
  }));

  const combined = [...platformItems, ...adminItems];
  combined.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return combined;
}

/** Platform announcements only (for provider/customer bell — no per-business admin_notifications). */
export async function getPlatformOnlyNotificationsForUser(
  supabase: SupabaseClient,
  userId: string,
  viewer: PlatformViewerKind
): Promise<MergedNotificationRow[]> {
  const visible = await listActivePlatformAnnouncementsForViewer(supabase, viewer);
  const readIds = await getReadAnnouncementIdsForUser(supabase, userId);
  const rows: MergedNotificationRow[] = visible.map((a) => ({
    id: toPlatformNotificationId(a.id),
    title: a.title,
    description: a.body ?? '',
    read: readIds.has(a.id),
    created_at: a.created_at,
    link: null,
    source: 'platform',
    level: a.level,
    audience: a.audience,
  }));
  rows.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return rows;
}
