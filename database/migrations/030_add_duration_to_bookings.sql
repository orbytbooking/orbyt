-- Add duration_minutes to bookings (e.g. 120 for 2 hours, 200 for 3 Hr 20 Min)
-- Used for display in booking summary and reporting
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS duration_minutes integer NULL;

COMMENT ON COLUMN public.bookings.duration_minutes IS 'Total service length in minutes (e.g. 120 for 2 hours, 200 for 3 Hr 20 Min)';
