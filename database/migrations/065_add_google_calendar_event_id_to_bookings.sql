-- Store Google Calendar event id for sync (create/update/delete)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS google_calendar_event_id text;

COMMENT ON COLUMN public.bookings.google_calendar_event_id IS 'Google Calendar event id when business has Google Calendar connected; used for reschedule/cancel sync';
