-- Update specific extras to be quantity-based
-- These extras should show quantity selectors instead of checkboxes

UPDATE public.industry_extra 
SET qty_based = true 
WHERE name IN (
    'Inside Fridge',
    'Kitchen', 
    'Laundry',
    'Paint Removal',
    'Inside Cabinets',
    'Inside Oven',
    'Wet Wipe Window Blinds'
);

-- Verify the updates
SELECT id, name, qty_based 
FROM public.industry_extra 
WHERE name IN (
    'Inside Fridge',
    'Kitchen', 
    'Laundry',
    'Paint Removal',
    'Inside Cabinets',
    'Inside Oven',
    'Wet Wipe Window Blinds'
)
ORDER BY name;
