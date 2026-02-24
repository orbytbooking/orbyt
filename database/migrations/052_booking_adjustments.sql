-- Persist booking adjustment flags and amounts from admin add-booking form
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS adjust_service_total boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS adjustment_service_total_amount numeric(10,2) NULL,
  ADD COLUMN IF NOT EXISTS adjust_price boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS adjustment_amount numeric(10,2) NULL,
  ADD COLUMN IF NOT EXISTS adjust_time boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.bookings.adjust_service_total IS 'Admin overrode service total with a custom amount';
COMMENT ON COLUMN public.bookings.adjustment_service_total_amount IS 'Custom service total when adjust_service_total is true';
COMMENT ON COLUMN public.bookings.adjust_price IS 'Admin applied a price adjustment (discount or surcharge)';
COMMENT ON COLUMN public.bookings.adjustment_amount IS 'Price adjustment amount when adjust_price is true';
COMMENT ON COLUMN public.bookings.adjust_time IS 'Admin overrode booking time/duration';
