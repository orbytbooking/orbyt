-- Add exclude_parameters column to industry_pricing_parameter table
-- This column stores an array of exclude parameter IDs that should be excluded when this pricing parameter is selected

-- Add the column if it doesn't exist
ALTER TABLE public.industry_pricing_parameter
ADD COLUMN IF NOT EXISTS exclude_parameters integer[] NULL DEFAULT '{}'::integer[];

-- Add a comment to document the column
COMMENT ON COLUMN public.industry_pricing_parameter.exclude_parameters IS 'Array of exclude parameter IDs that should be excluded when this pricing parameter is selected';
