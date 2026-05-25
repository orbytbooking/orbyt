-- Add per-booking exclude flags: cancellation fee, customer notification, provider notification
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS exclude_cancellation_fee boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclude_customer_notification boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exclude_provider_notification boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.bookings.exclude_cancellation_fee IS 'When true, do not apply cancellation fee if this booking is cancelled';
COMMENT ON COLUMN public.bookings.exclude_customer_notification IS 'When true, do not send booking notifications to the customer';
COMMENT ON COLUMN public.bookings.exclude_provider_notification IS 'When true, do not send booking notifications to the provider';
