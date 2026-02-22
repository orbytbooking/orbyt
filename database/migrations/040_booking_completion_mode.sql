-- Add booking_completion_mode to business_store_options
-- manual: provider or admin must mark booking as completed
-- automatic: booking auto-completes when job length has passed (start time + duration)

ALTER TABLE public.business_store_options
  ADD COLUMN IF NOT EXISTS booking_completion_mode text NOT NULL DEFAULT 'manual'
  CHECK (booking_completion_mode IN ('manual', 'automatic'));

COMMENT ON COLUMN public.business_store_options.booking_completion_mode IS
  'manual = provider/admin marks complete; automatic = completes when start + duration has passed';
