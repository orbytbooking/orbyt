-- Address settings (Booking Koala-style): show location name at end of address in bookings
ALTER TABLE public.business_store_options
  ADD COLUMN IF NOT EXISTS show_location_name_at_end boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.business_store_options.show_location_name_at_end IS 'When true, display the location name at the end of the address shown for bookings';
