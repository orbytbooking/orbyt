-- Per-occurrence time tracking for recurring bookings.
-- When set, one time log per (booking_id, provider_id, occurrence_date); when null, one log per booking (non-recurring).

ALTER TABLE public.booking_time_logs
  ADD COLUMN IF NOT EXISTS occurrence_date date;

COMMENT ON COLUMN public.booking_time_logs.occurrence_date IS 'For recurring bookings: the occurrence date (YYYY-MM-DD) this log applies to. Null for one-time bookings.';

-- Drop old one-per-booking unique index so we can have multiple logs per booking (one per occurrence)
DROP INDEX IF EXISTS public.idx_booking_time_logs_booking;

-- One time log per booking when non-recurring (occurrence_date IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_time_logs_booking_provider_null_occurrence
  ON public.booking_time_logs (booking_id, provider_id) WHERE occurrence_date IS NULL;

-- One time log per (booking, provider, occurrence_date) when recurring
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_time_logs_booking_provider_occurrence
  ON public.booking_time_logs (booking_id, provider_id, occurrence_date) WHERE occurrence_date IS NOT NULL;
