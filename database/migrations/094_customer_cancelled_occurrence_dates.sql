-- Per-occurrence customer cancellations for recurring bookings (customer portal).
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_cancelled_occurrence_dates text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.bookings.customer_cancelled_occurrence_dates IS
  'For recurring bookings: YYYY-MM-DD dates the customer cancelled from the portal (single occurrence only).';
