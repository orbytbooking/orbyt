-- Store before/after booking snapshots on activity logs for the admin log detail view.

ALTER TABLE public.booking_quote_activity_logs
  ADD COLUMN IF NOT EXISTS metadata jsonb;

COMMENT ON COLUMN public.booking_quote_activity_logs.metadata IS
  'Optional JSON: { current, previous, recurring_series_id } booking field snapshots for log detail Summary.';
