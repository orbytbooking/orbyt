-- Add voided and declined to payment_status for Booking Koala-style charge workflow
-- voided: Job done but charged $0 (no payment taken)
-- declined: Charge attempt failed (card declined, etc.)

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'refunded'::text, 'voided'::text, 'declined'::text]));

COMMENT ON COLUMN public.bookings.payment_status IS 'pending=awaiting charge, paid=charged, refunded=refunded, voided=no charge ($0), declined=charge attempt failed';
