-- Check current logo status in database
SELECT 
  id, 
  name, 
  logo_url,
  CASE 
    WHEN logo_url IS NULL THEN 'No logo'
    WHEN logo_url LIKE 'http%' THEN 'Has logo URL'
    WHEN logo_url LIKE 'blob:%' THEN 'Has blob URL (bad)'
    ELSE 'Other'
  END as logo_status
FROM public.businesses 
WHERE id = '20ec44c8-1d49-45b9-ac7e-0412fd610ffb';

-- Check storage files
SELECT name, created_at, updated_at 
FROM storage.objects 
WHERE bucket_id = 'business-logos' 
ORDER BY created_at DESC;
