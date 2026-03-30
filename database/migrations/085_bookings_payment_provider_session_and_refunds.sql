-- Store provider session/transaction references on bookings to enable refunds.
-- This is intentionally minimal and safe to run multiple times.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_provider_session_id text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS refund_provider text,
  ADD COLUMN IF NOT EXISTS refund_id text;

