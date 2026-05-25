-- MVP: GPS & Time Logs options (Booking Koala-style)
ALTER TABLE public.business_store_options
  ADD COLUMN IF NOT EXISTS time_tracking_mode text NOT NULL DEFAULT 'timestamps_only'
    CHECK (time_tracking_mode IN ('timestamps_only', 'timestamps_and_gps')),
  ADD COLUMN IF NOT EXISTS distance_unit text NOT NULL DEFAULT 'miles'
    CHECK (distance_unit IN ('miles', 'kilometers')),
  ADD COLUMN IF NOT EXISTS disable_auto_clock_in boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_clock_out_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_clock_out_distance_meters integer DEFAULT 500,
  ADD COLUMN IF NOT EXISTS completion_on_clock_out boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_reclock_in boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS time_log_updates_booking boolean DEFAULT false;

COMMENT ON COLUMN public.business_store_options.time_tracking_mode IS 'timestamps_only = no GPS; timestamps_and_gps = track path';
COMMENT ON COLUMN public.business_store_options.distance_unit IS 'Display and distance checks: miles or kilometers';
COMMENT ON COLUMN public.business_store_options.disable_auto_clock_in IS 'When true, disable auto clock-in for a booking';
COMMENT ON COLUMN public.business_store_options.auto_clock_out_enabled IS 'Auto clock out provider when they leave booking location';
COMMENT ON COLUMN public.business_store_options.auto_clock_out_distance_meters IS 'Meters from booking location to trigger auto clock out';
COMMENT ON COLUMN public.business_store_options.completion_on_clock_out IS 'When true, mark booking complete when provider clocks out (else on job length)';
COMMENT ON COLUMN public.business_store_options.allow_reclock_in IS 'Allow providers to re-clock in on a booking after clocking out';
COMMENT ON COLUMN public.business_store_options.time_log_updates_booking IS 'When true, time adjustments in time logs update the booking as well';
