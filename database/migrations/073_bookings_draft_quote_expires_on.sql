-- Optional expiry date for draft/quote rows; after this calendar day, status can be set to expired.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS draft_quote_expires_on date;

COMMENT ON COLUMN public.bookings.draft_quote_expires_on IS
  'Last valid calendar day for the draft/quote (end of day). When the current date is after this day, status may be set to expired.';

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (
  status = ANY (
    ARRAY[
      'pending'::text,
      'confirmed'::text,
      'in_progress'::text,
      'completed'::text,
      'cancelled'::text,
      'draft'::text,
      'quote'::text,
      'expired'::text
    ]
  )
);

COMMENT ON CONSTRAINT bookings_status_check ON public.bookings IS
  'Booking lifecycle plus draft/quote and expired (past draft_quote_expires_on).';
