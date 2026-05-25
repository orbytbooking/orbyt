-- Update only the "Inside Fridge" extra to have maximum quantity of 2
-- This is just for testing - other extras will remain NULL (unlimited)

UPDATE public.industry_extras 
SET maximum_quantity = 2 
WHERE name = 'Inside Fridge';

-- Verify the update
SELECT id, name, maximum_quantity 
FROM public.industry_extras 
WHERE name = 'Inside Fridge';
