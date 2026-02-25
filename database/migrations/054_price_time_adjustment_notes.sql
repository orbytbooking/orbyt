-- Price & Time Adjustment: enable note section per business (General settings)
ALTER TABLE public.business_store_options
  ADD COLUMN IF NOT EXISTS price_adjustment_note_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS time_adjustment_note_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.business_store_options.price_adjustment_note_enabled IS 'When true, show a note input when admin applies a price adjustment on a booking';
COMMENT ON COLUMN public.business_store_options.time_adjustment_note_enabled IS 'When true, show a note input when admin applies a time adjustment on a booking';

-- Store the note text on the booking when admin fills it
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS price_adjustment_note text NULL,
  ADD COLUMN IF NOT EXISTS time_adjustment_note text NULL;

COMMENT ON COLUMN public.bookings.price_adjustment_note IS 'Optional note entered when price adjustment is applied (if setting enabled)';
COMMENT ON COLUMN public.bookings.time_adjustment_note IS 'Optional note entered when time adjustment is applied (if setting enabled)';
