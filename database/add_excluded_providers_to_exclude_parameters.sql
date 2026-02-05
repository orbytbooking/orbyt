-- Add excluded_providers column to industry_exclude_parameter table
-- This column will store an array of provider IDs that should be excluded

ALTER TABLE public.industry_exclude_parameter 
ADD COLUMN IF NOT EXISTS excluded_providers text[] DEFAULT '{}';

-- Add comment to explain the column
COMMENT ON COLUMN public.industry_exclude_parameter.excluded_providers IS 'Array of provider IDs that should be excluded from this exclude parameter';
