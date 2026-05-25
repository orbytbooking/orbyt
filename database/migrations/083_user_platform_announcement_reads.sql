-- Per-user read/dismiss state for platform announcements (shown in notification bells)

CREATE TABLE IF NOT EXISTS public.user_platform_announcement_reads (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  announcement_id uuid NOT NULL REFERENCES public.platform_announcements (id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_platform_announcement_reads_pkey PRIMARY KEY (user_id, announcement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_platform_announcement_reads_user
  ON public.user_platform_announcement_reads (user_id);

COMMENT ON TABLE public.user_platform_announcement_reads IS 'Marks platform announcements as read/dismissed per user for in-app notification UI.';
