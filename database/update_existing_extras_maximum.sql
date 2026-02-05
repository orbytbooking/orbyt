-- Update existing extras to set maximum_quantity values
-- This script assumes the maximum_quantity column already exists

-- Update "Inside Fridge" extra to have maximum quantity of 2 (or change as needed)
UPDATE public.industry_extras 
SET maximum_quantity = 2 
WHERE name = 'Inside Fridge' AND maximum_quantity IS NULL;

-- Set a reasonable default for other extras that have NULL maximum_quantity
-- You can modify this value or update specific extras individually
UPDATE public.industry_extras 
SET maximum_quantity = 999 
WHERE maximum_quantity IS NULL;

-- Optional: Update specific extras with custom limits
-- Uncomment and modify as needed:
-- UPDATE public.industry_extras SET maximum_quantity = 5 WHERE name = 'Kitchen';
-- UPDATE public.industry_extras SET maximum_quantity = 3 WHERE name = 'Bathroom';
-- UPDATE public.industry_extras SET maximum_quantity = 10 WHERE name = 'Garage';

-- Verify the updates
SELECT id, name, maximum_quantity 
FROM public.industry_extras 
WHERE name IN ('Inside Fridge', 'Kitchen')
ORDER BY name;
