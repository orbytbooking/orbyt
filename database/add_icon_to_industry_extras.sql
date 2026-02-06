-- Add icon column to industry_extras table
-- This column stores the icon identifier or URL for the extra

ALTER TABLE public.industry_extras
ADD COLUMN IF NOT EXISTS icon text NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.industry_extras.icon IS 'Icon identifier or URL for the extra (e.g., "laundry", "furniture", or a custom uploaded image URL)';
