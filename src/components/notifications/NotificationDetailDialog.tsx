'use client';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export type NotificationDetailItem = {
  id: string;
  title: string;
  description: string;
  read?: boolean;
  link?: string | null;
  source?: 'admin' | 'platform';
  created_at?: string;
  level?: string | null;
  audience?: string | null;
};

function formatAudienceLabel(audience: string | null | undefined) {
  if (!audience || audience === 'all') return 'All users';
  if (audience === 'owners') return 'Owners';
  if (audience === 'providers') return 'Providers';
  if (audience === 'customers') return 'Customers';
  return audience;
}

type ThemeMode = 'dark' | 'light';

export function NotificationDetailDialog({
  open,
  onOpenChange,
  item,
  theme = 'light',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: NotificationDetailItem | null;
  /** Admin layout uses dark; provider/customer bells use light */
  theme?: ThemeMode;
}) {
  const router = useRouter();
  const isDark = theme === 'dark';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto sm:max-w-2xl gap-5 p-8">
        <DialogHeader className="space-y-3">
          <DialogTitle
            className={`text-left pr-10 text-2xl font-semibold leading-snug tracking-tight sm:text-3xl ${
              isDark ? 'text-white' : 'text-foreground'
            }`}
          >
            {item?.title ?? 'Notification'}
          </DialogTitle>
          {item && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-0.5">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                  item.source === 'platform'
                    ? isDark
                      ? 'bg-violet-500/25 text-violet-100'
                      : 'bg-violet-200/90 text-violet-950'
                    : isDark
                      ? 'bg-cyan-500/25 text-cyan-100'
                      : 'bg-cyan-200/90 text-cyan-950'
                }`}
              >
                {item.source === 'platform' ? 'Platform announcement' : 'Business notification'}
              </span>
              {item.source === 'platform' && item.level && (
                <span
                  className={`text-sm font-medium capitalize ${
                    isDark ? 'text-gray-200' : 'text-gray-800'
                  }`}
                >
                  Level: {item.level}
                </span>
              )}
              {item.source === 'platform' && (
                <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {formatAudienceLabel(item.audience)}
                </span>
              )}
              {item.created_at && (
                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {new Date(item.created_at).toLocaleString()}
                </span>
              )}
            </div>
          )}
        </DialogHeader>
        {item && (
          <div
            className={`min-h-[3rem] text-lg leading-7 whitespace-pre-wrap rounded-lg border px-4 py-4 sm:text-xl sm:leading-8 ${
              isDark
                ? 'border-white/10 bg-white/5 text-gray-100'
                : 'border-gray-200 bg-gray-50/80 text-gray-900'
            }`}
          >
            {item.description || '—'}
          </div>
        )}
        <DialogFooter className="gap-3 sm:gap-3">
          {item?.link ? (
            <Button
              type="button"
              size="lg"
              className="text-base font-semibold"
              onClick={() => {
                const href = item.link!;
                onOpenChange(false);
                router.push(href);
              }}
            >
              Open linked page
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="text-base font-semibold"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
