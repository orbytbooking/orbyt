-- Add excluded_providers column to industry_extras table
-- This column will store an array of provider IDs that should be excluded

ALTER TABLE public.industry_extras 
ADD COLUMN IF NOT EXISTS excluded_providers text[] DEFAULT '{}';

-- Add comment to explain the column
COMMENT ON COLUMN public.industry_extras.excluded_providers IS 'Array of provider IDs that should be excluded from this extra';
