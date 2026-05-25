-- Persist card brand + last4 for display in Booking Charges.
-- Safe to run multiple times.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS card_last4 text,
  ADD COLUMN IF NOT EXISTS card_brand text;

