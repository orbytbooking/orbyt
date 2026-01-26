-- Check if business logo setup is complete
-- Run this in your Supabase SQL editor

-- 1. Check if logo_url column exists in businesses table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
  AND table_schema = 'public'
  AND column_name = 'logo_url';

-- 2. Check if business-logos bucket exists
SELECT * FROM storage.buckets WHERE id = 'business-logos';

-- 3. Check if RLS policies exist for storage.objects
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%business%';

-- 4. Check current businesses with logo_url
SELECT id, name, logo_url, created_at 
FROM public.businesses 
WHERE logo_url IS NOT NULL 
LIMIT 5;

-- 5. Check storage objects in business-logos bucket
SELECT * FROM storage.objects WHERE bucket_id = 'business-logos' LIMIT 5;

-- 6. Test if user can access storage
SELECT 
  auth.uid() as user_id,
  auth.role() as user_role;

-- 7. Check if there are any businesses at all
SELECT COUNT(*) as total_businesses FROM public.businesses;

-- 8. Sample business data to verify structure
SELECT id, name, owner_id, logo_url 
FROM public.businesses 
LIMIT 3;
