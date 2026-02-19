-- Add frequency column to bookings for customer portal (e.g. One-time, Weekly, Bi-weekly)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS frequency text;

COMMENT ON COLUMN public.bookings.frequency IS 'Booking frequency from customer: One-time, Weekly, Bi-weekly, etc.';
