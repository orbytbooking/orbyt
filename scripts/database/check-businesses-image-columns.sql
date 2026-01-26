-- Check if businesses table has image-related columns
-- Run this in your Supabase SQL editor

-- Check the structure of the businesses table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Look for image-related columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
  AND table_schema = 'public'
  AND (column_name LIKE '%image%' 
       OR column_name LIKE '%logo%' 
       OR column_name LIKE '%picture%' 
       OR column_name LIKE '%photo%'
       OR column_name LIKE '%avatar%');

-- Check if there are any businesses with image data
SELECT id, name, created_at 
FROM public.businesses 
LIMIT 5;

-- If you need to add an image column, you can use:
-- ALTER TABLE public.businesses ADD COLUMN logo_url text;
-- ALTER TABLE public.businesses ADD COLUMN business_image text;
