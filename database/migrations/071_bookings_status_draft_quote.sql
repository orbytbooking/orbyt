-- Allow admin "Save As Draft" and "Save As Quote" (add-booking UI + Draft/Quote tab).
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
      'quote'::text
    ]
  )
);

COMMENT ON CONSTRAINT bookings_status_check ON public.bookings IS
  'Booking lifecycle plus draft/quote for unconfirmed admin-created records.';
