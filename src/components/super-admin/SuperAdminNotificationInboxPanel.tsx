'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Filter,
  Loader2,
  Megaphone,
  MessageSquare,
  Search,
  Headphones,
} from 'lucide-react';
import {
  NotificationDetailDialog,
  type NotificationDetailItem,
} from '@/components/notifications/NotificationDetailDialog';
import { PLATFORM_NOTIF_ID_PREFIX, parseSupportNotificationId } from '@/lib/platform-announcement-notifications';

type SourceFilter = 'all' | 'platform' | 'support';
type ReadFilter = 'all' | 'unread' | 'read';

type Row = {
  id: string;
  title: string;
  description: string;
  read: boolean;
  created_at: string;
  link: string | null;
  source: 'platform' | 'support' | 'admin';
  level: string | null;
  audience: string | null;
};

function formatRelativeTime(iso: string | undefined) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  let diff = Date.now() - t;
  if (diff < 0) diff = 0;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

type Props = {
  onSelectSupportTicket: (ticketId: string) => void;
  onAnnouncementsMarkedRead?: () => void;
};

export function SuperAdminNotificationInboxPanel({
  onSelectSupportTicket,
  onAnnouncementsMarkedRead,
}: Props) {
  const [source, setSource] = useState<SourceFilter>('all');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<NotificationDetailItem | null>(null);
  const [markAllLoading, setMarkAllLoading] = useState(false);

  const buildQuery = useCallback(() => {
    const q = new URLSearchParams();
    q.set('ticket_limit', '500');
    if (source !== 'all') q.set('source', source);
    if (readFilter !== 'all') q.set('read', readFilter);
    return q.toString();
  }, [source, readFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/notifications?${buildQuery()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        setError('Could not load notifications');
        setRows([]);
        return;
      }
      const data = await res.json();
      setRows(data.notifications ?? []);
    } catch {
      setError('Could not load notifications');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const platformRows = filtered.filter((r) => r.source === 'platform');
  const supportRows = filtered.filter((r) => r.source === 'support');
  const unreadCount = useMemo(() => rows.filter((r) => !r.read).length, [rows]);

  const markAllRead = async () => {
    setMarkAllLoading(true);
    try {
      const res = await fetch('/api/super-admin/notifications', {
        method: 'PATCH',
        credentials: 'include',
      });
      if (res.ok) {
        await load();
        onAnnouncementsMarkedRead?.();
      }
    } finally {
      setMarkAllLoading(false);
    }
  };

  const onRowClick = async (n: Row) => {
    const ticketUuid = parseSupportNotificationId(n.id);
    if (ticketUuid) {
      onSelectSupportTicket(ticketUuid);
      return;
    }
    if (n.id.startsWith(PLATFORM_NOTIF_ID_PREFIX)) {
      if (!n.read) {
        await fetch(`/api/super-admin/notifications/${encodeURIComponent(n.id)}`, {
          method: 'PATCH',
          credentials: 'include',
        });
        setRows((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        onAnnouncementsMarkedRead?.();
      }
      setDetail({
        id: n.id,
        title: n.title,
        description: n.description,
        read: true,
        source: 'platform',
        created_at: n.created_at,
        level: n.level,
        audience: n.audience,
      });
    }
  };

  const renderList = (list: Row[], label: string, icon: ReactNode) => {
    if (list.length === 0) return null;
    return (
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{label}</h3>
          <span className="text-xs text-gray-500">({list.length})</span>
        </div>
        <ul className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 shadow-sm">
          {list.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => void onRowClick(n)}
                className={`w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors flex gap-3 ${
                  !n.read ? 'bg-blue-50/60' : ''
                }`}
              >
                <div
                  className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${n.read ? 'bg-gray-300' : 'bg-blue-600'}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-3 whitespace-pre-wrap">{n.description}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {formatRelativeTime(n.created_at)}
                    {n.source === 'platform' && n.level ? ` · ${n.level}` : ''}
                    {n.audience && n.audience !== 'all' ? ` · ${n.audience}` : ''}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  };

  const showGrouped = source === 'all' && !search.trim();

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <p className="text-gray-600 text-sm max-w-2xl">
          Platform announcements and support ticket activity. Filter by source and read state; search matches title and
          body.
        </p>
        <button
          type="button"
          onClick={() => void markAllRead()}
          disabled={markAllLoading || unreadCount === 0}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 shrink-0"
        >
          {markAllLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Mark announcements read
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-gray-700">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Source</span>
          {(['all', 'platform', 'support'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                source === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'All' : s === 'platform' ? 'Announcements' : 'Support'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-gray-700">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</span>
          {(['all', 'unread', 'read'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReadFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                readFilter === r ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {r === 'all' ? 'All' : r === 'unread' ? 'Unread' : 'Read'}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or description…"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <p className="text-xs text-gray-500">
          {loading ? 'Loading…' : `${filtered.length} shown`}
          {!loading && search.trim() ? ` (search within ${rows.length} loaded)` : null}
          {!loading ? ` · ${unreadCount} unread` : null}
        </p>
      </div>

      {error && (
        <div className="mb-6 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</div>
      )}

      {loading && rows.length === 0 && (
        <div className="flex justify-center py-16 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500 bg-white rounded-xl border border-gray-200">
          No notifications match your filters.
        </div>
      )}

      {!loading && filtered.length > 0 && showGrouped && (
        <>
          {renderList(platformRows, 'Announcements', <Megaphone className="h-4 w-4 text-violet-600" />)}
          {renderList(supportRows, 'Support tickets', <Headphones className="h-4 w-4 text-amber-600" />)}
          {platformRows.length === 0 && supportRows.length === 0 && (
            <p className="text-center text-gray-500 py-8">No matches.</p>
          )}
        </>
      )}

      {!loading && filtered.length > 0 && !showGrouped && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Results</h3>
            <span className="text-xs text-gray-500">({filtered.length})</span>
          </div>
          <ul className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 shadow-sm">
            {filtered.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void onRowClick(n)}
                  className={`w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors flex gap-3 ${
                    !n.read ? 'bg-blue-50/60' : ''
                  }`}
                >
                  <div
                    className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${n.read ? 'bg-gray-300' : 'bg-blue-600'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-indigo-600">
                      {n.source === 'platform' ? 'Announcement' : 'Support'}
                    </span>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{n.title}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-3 whitespace-pre-wrap">{n.description}</p>
                    <p className="text-xs text-gray-400 mt-2">{formatRelativeTime(n.created_at)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <NotificationDetailDialog
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        item={detail}
        theme="light"
      />
    </>
  );
}
