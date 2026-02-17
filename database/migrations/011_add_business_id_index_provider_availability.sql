-- Add index on business_id for provider_availability table
-- This improves query performance when filtering by business_id for business isolation

CREATE INDEX IF NOT EXISTS idx_provider_availability_business_id 
ON public.provider_availability 
USING btree (business_id) 
TABLESPACE pg_default;

-- Composite index for common query patterns (business + provider + day)
CREATE INDEX IF NOT EXISTS idx_provider_availability_business_provider_day 
ON public.provider_availability 
USING btree (business_id, provider_id, day_of_week) 
TABLESPACE pg_default;

-- Index for date range queries (business + effective_date + expiry_date)
CREATE INDEX IF NOT EXISTS idx_provider_availability_business_dates 
ON public.provider_availability 
USING btree (business_id, effective_date, expiry_date) 
WHERE effective_date IS NOT NULL OR expiry_date IS NOT NULL
TABLESPACE pg_default;
