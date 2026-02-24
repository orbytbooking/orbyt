-- Fix recurring bookings that were previously marked completed on the whole row.
-- From now on only completed_occurrence_dates drives which occurrence is completed.
UPDATE public.bookings
SET status = 'confirmed'
WHERE recurring_series_id IS NOT NULL
  AND status = 'completed';
