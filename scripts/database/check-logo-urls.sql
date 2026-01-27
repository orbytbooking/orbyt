-- Check what logo URLs are stored in the database
SELECT id, name, logo_url, 
  CASE 
    WHEN logo_url LIKE 'blob:%' THEN 'BLOB URL (Temporary)'
    WHEN logo_url LIKE 'http%' THEN 'HTTP URL (Permanent)'
    WHEN logo_url IS NULL THEN 'NULL'
    ELSE 'Other'
  END as url_type
FROM public.businesses 
WHERE logo_url IS NOT NULL OR logo_url IS NOT NULL;

-- Check if there are any blob URLs stored
SELECT COUNT(*) as blob_urls_count 
FROM public.businesses 
WHERE logo_url LIKE 'blob:%';

-- Check storage objects in avatars bucket
SELECT name, created_at, updated_at 
FROM storage.objects 
WHERE bucket_id = 'avatars' 
ORDER BY created_at DESC 
LIMIT 10;
