-- Track which booking reminder notification templates have already been sent (per booking).
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS notification_reminders_sent jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.bookings.notification_reminders_sent IS
  'Map of reminder template sent keys to ISO timestamps, e.g. {"provider_one_day_reminder":"2026-06-17T12:00:00.000Z"}.';
