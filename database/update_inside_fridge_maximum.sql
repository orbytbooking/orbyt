-- Update maximum_quantity for "Inside Fridge" extra
-- Set maximum_quantity to 2 for the "Inside Fridge" extra
-- Replace 'your_extra_id_here' with the actual ID of the "Inside Fridge" extra

UPDATE public.industry_extras 
SET maximum_quantity = 2 
WHERE name = 'Inside Fridge';

-- Set default maximum_quantity for existing extras that have NULL
-- This prevents future NULL values and ensures a reasonable default
UPDATE public.industry_extras 
SET maximum_quantity = 999 
WHERE maximum_quantity IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.industry_extras.maximum_quantity IS 'Maximum quantity allowed for this extra (NULL = unlimited)';
