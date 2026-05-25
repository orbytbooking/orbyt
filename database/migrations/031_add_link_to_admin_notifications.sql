-- Add link column for notification click-to-navigate
ALTER TABLE public.admin_notifications
  ADD COLUMN IF NOT EXISTS link text;

COMMENT ON COLUMN public.admin_notifications.link IS 'URL to navigate when notification is clicked (e.g. /admin/bookings, /admin/customers/xxx)';
