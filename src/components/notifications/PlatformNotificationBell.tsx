'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  NotificationDetailDialog,
  type NotificationDetailItem,
} from '@/components/notifications/NotificationDetailDialog';

/**
 * In-app bell for platform announcements (provider & customer portals).
 * Uses Bearer session token; API must match role (provider vs customer).
 */
export function PlatformNotificationBell({
  apiBase,
  getAuthHeaders,
  variant = 'default',
}: {
  apiBase: string;
  getAuthHeaders: () => Promise<HeadersInit | undefined>;
  variant?: 'default' | 'muted';
}) {
  const [notifications, setNotifications] = useState<NotificationDetailItem[]>([]);
  const [detail, setDetail] = useState<NotificationDetailItem | null>(null);
  const [loading, setLoading] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const base = apiBase.replace(/\/$/, '');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(base, { headers: headers ?? {} });
      if (!res.ok) {
        setNotifications([]);
        return;
      }
      const data = await res.json();
      setNotifications(
        (data.notifications || []).map(
          (n: {
            id: string;
            title: string;
            description?: string;
            read?: boolean;
            link?: string | null;
            source?: 'admin' | 'platform';
            created_at?: string;
            level?: string | null;
            audience?: string | null;
          }) => ({
            id: n.id,
            title: n.title,
            description: n.description ?? '',
            read: !!n.read,
            link: n.link ?? null,
            source: n.source ?? 'platform',
            created_at: n.created_at,
            level: n.level,
            audience: n.audience,
          })
        )
      );
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(base, { method: 'PATCH', headers: headers ?? {} });
      if (res.ok) setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* ignore */
    }
  };

  const markOneRead = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${base}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: headers ?? {},
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        setDetail((d) => (d?.id === id ? { ...d, read: true } : d));
      }
    } catch {
      /* ignore */
    }
  };

  /** Dismiss: for platform items this marks read (same as admin bell). */
  const dismissOne = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${base}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: headers ?? {},
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        setDetail((d) => (d?.id === id ? { ...d, read: true } : d));
      }
    } catch {
      /* ignore */
    }
  };

  const triggerClass =
    variant === 'muted'
      ? 'relative text-muted-foreground hover:text-foreground'
      : 'relative text-primary hover:bg-muted';

  return (
    <>
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) void fetchNotifications();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={triggerClass} aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-medium">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between gap-2 px-3 py-2">
          <span>Notifications</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              void markAllAsRead();
            }}
            className="text-xs text-primary hover:underline font-normal"
          >
            Mark all as read
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
          {loading && notifications.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">Loading…</div>
          )}
          {!loading && notifications.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">No notifications</div>
          )}
          {notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex items-start gap-2 py-3 cursor-pointer"
              onSelect={() => {
                if (!n.read) void markOneRead(n.id);
                setDetail(n);
              }}
            >
              <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${n.read ? 'bg-muted' : 'bg-primary'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">{n.description}</div>
              </div>
              <button
                type="button"
                className="ml-1 text-xs text-muted-foreground hover:text-destructive flex-shrink-0"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void dismissOne(n.id);
                }}
              >
                Dismiss
              </button>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
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
