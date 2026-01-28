-- Add icon column to industry_exclude_parameter table
-- This column will store either a predefined icon name or a base64 encoded custom icon

ALTER TABLE public.industry_exclude_parameter 
ADD COLUMN IF NOT EXISTS icon text null;

-- Add comment to explain the column
COMMENT ON COLUMN public.industry_exclude_parameter.icon IS 'Stores either a predefined icon name (e.g., "dog", "cigarette") or a base64 encoded custom icon image (data:image/...)';
