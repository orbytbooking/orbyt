-- Add columns for private booking notes, private customer notes, and notes for service provider
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS private_booking_notes jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS private_customer_notes jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS service_provider_notes jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN public.bookings.private_booking_notes IS 'Admin-only notes for this booking (array of strings)';
COMMENT ON COLUMN public.bookings.private_customer_notes IS 'Admin-only notes about the customer for this booking (array of strings)';
COMMENT ON COLUMN public.bookings.service_provider_notes IS 'Notes visible to the service provider for this booking (array of strings)';
