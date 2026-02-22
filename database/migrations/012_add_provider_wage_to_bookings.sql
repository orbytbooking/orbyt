-- ========================================
-- MIGRATION: ADD PROVIDER WAGE TO BOOKINGS
-- ========================================
-- This migration adds provider_wage and provider_wage_type columns to the bookings table
-- to support per-booking wage overrides

-- Add provider wage columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS provider_wage numeric,
ADD COLUMN IF NOT EXISTS provider_wage_type text CHECK (provider_wage_type IN ('percentage', 'fixed', 'hourly'));

-- Add index for provider wage queries
CREATE INDEX IF NOT EXISTS idx_bookings_provider_wage ON public.bookings(provider_id, provider_wage_type) 
WHERE provider_wage IS NOT NULL;

-- Add comment to document the columns
COMMENT ON COLUMN public.bookings.provider_wage IS 'Custom wage amount for this specific booking. Overrides provider default pay rate.';
COMMENT ON COLUMN public.bookings.provider_wage_type IS 'Type of wage: percentage (of booking total), fixed (dollar amount), or hourly (per hour of service).';
