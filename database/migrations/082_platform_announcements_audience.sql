-- Target audience for platform announcements (Super Admin chooses who sees each message)

ALTER TABLE public.platform_announcements
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all';

ALTER TABLE public.platform_announcements
  DROP CONSTRAINT IF EXISTS platform_announcements_audience_check;

ALTER TABLE public.platform_announcements
  ADD CONSTRAINT platform_announcements_audience_check
  CHECK (audience IN ('all', 'owners', 'providers', 'customers'));

CREATE INDEX IF NOT EXISTS idx_platform_announcements_audience ON public.platform_announcements (audience);

COMMENT ON COLUMN public.platform_announcements.audience IS 'Who sees this: all users, owners only, providers only, or customers only.';
