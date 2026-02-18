-- ========================================
-- FIX: Allow provider_earnings.service_id to be NULL
-- ========================================
-- Fixes: null value in column "service_id" of relation "provider_earnings"
--        violates not-null constraint
-- Bookings often have service_id = null (they use service text instead).
-- We allow NULL so the earnings trigger can complete.

-- Drop the foreign key so we can alter the column
ALTER TABLE public.provider_earnings
  DROP CONSTRAINT IF EXISTS provider_earnings_service_id_fkey;

-- Allow NULL and set existing nulls (if any) to stay null
ALTER TABLE public.provider_earnings
  ALTER COLUMN service_id DROP NOT NULL;

-- Re-add the foreign key (allows NULL, still validates when present)
ALTER TABLE public.provider_earnings
  ADD CONSTRAINT provider_earnings_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.provider_earnings.service_id IS 'Optional link to services table. NULL when booking has no service_id (e.g. service name only).';
