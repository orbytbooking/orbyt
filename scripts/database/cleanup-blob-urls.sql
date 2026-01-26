-- Clean up blob URLs from businesses table
-- Run this script to remove any blob URLs that were accidentally stored

-- First, let's see what we're cleaning up
SELECT 
  id, 
  name, 
  logo_url,
  CASE 
    WHEN logo_url LIKE 'blob:%' THEN 'BLOB URL (Will be cleared)'
    WHEN logo_url LIKE 'http%' THEN 'HTTP URL (Will be kept)'
    WHEN logo_url IS NULL THEN 'NULL'
    ELSE 'Other'
  END as url_type
FROM public.businesses 
WHERE logo_url IS NOT NULL;

-- Count how many blob URLs we have
SELECT COUNT(*) as blob_urls_to_clean 
FROM public.businesses 
WHERE logo_url LIKE 'blob:%';

-- Clean up blob URLs (set them to NULL)
UPDATE public.businesses 
SET logo_url = NULL 
WHERE logo_url LIKE 'blob:%';

-- Verify cleanup
SELECT COUNT(*) as remaining_blob_urls 
FROM public.businesses 
WHERE logo_url LIKE 'blob:%';

-- Show final state
SELECT 
  id, 
  name, 
  logo_url,
  CASE 
    WHEN logo_url IS NULL THEN 'NULL (Cleaned)'
    WHEN logo_url LIKE 'http%' THEN 'HTTP URL (Valid)'
    ELSE 'Other'
  END as final_status
FROM public.businesses 
WHERE logo_url IS NOT NULL OR logo_url IS NULL
ORDER BY name;
