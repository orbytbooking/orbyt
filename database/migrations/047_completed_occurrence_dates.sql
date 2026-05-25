-- Track which occurrence dates of a recurring booking have been completed.
-- When provider marks one date as completed, only that occurrence shows completed (not the whole series).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS completed_occurrence_dates text[] DEFAULT '{}';

COMMENT ON COLUMN public.bookings.completed_occurrence_dates IS 'For recurring bookings: dates (YYYY-MM-DD) that have been marked completed. Each occurrence shows completed only when its date is in this array.';
