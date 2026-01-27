-- Complete Logo System Test Suite
-- Run this in Supabase SQL Editor

-- Test 1: Check business logo status
SELECT '=== TEST 1: Business Logo Status ===' as test;
SELECT 
  id, 
  name, 
  logo_url,
  CASE 
    WHEN logo_url IS NULL THEN '❌ No logo'
    WHEN logo_url LIKE 'blob:%' THEN '❌ Blob URL (bad)'
    WHEN logo_url LIKE 'http%' THEN '✅ HTTP URL (good)'
    ELSE '⚠️ Other format'
  END as logo_status
FROM public.businesses 
WHERE id IN (SELECT id FROM public.businesses);

-- Test 2: Check storage files
SELECT '=== TEST 2: Storage Files ===' as test;
SELECT 
  name, 
  created_at, 
  updated_at,
  CASE 
    WHEN created_at > NOW() - INTERVAL '1 hour' THEN '🆕 Recent'
    ELSE '📁 Older'
  END as file_status
FROM storage.objects 
WHERE bucket_id = 'business-logos' 
ORDER BY created_at DESC;

-- Test 3: Check storage bucket configuration
SELECT '=== TEST 3: Storage Bucket Config ===' as test;
SELECT 
  id, 
  name, 
  public,
  file_size_limit,
  allowed_mime_types,
  CASE 
    WHEN public = true THEN '✅ Public'
    ELSE '❌ Private'
  END as access_status
FROM storage.buckets 
WHERE name = 'business-logos';

-- Test 4: Check business table structure
SELECT '=== TEST 4: Business Table Structure ===' as test;
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  CASE 
    WHEN column_name = 'logo_url' THEN '🎯 Logo column'
    ELSE '📄 Other column'
  END as column_info
FROM information_schema.columns 
WHERE table_name = 'businesses' 
  AND table_schema = 'public'
  AND column_name IN ('id', 'name', 'logo_url', 'updated_at')
ORDER BY column_name;

-- Test 5: Verify RLS policies
SELECT '=== TEST 5: RLS Policies ===' as test;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  CASE 
    WHEN tablename = 'businesses' THEN '🏢 Business table'
    WHEN tablename = 'storage.objects' THEN '📁 Storage objects'
    ELSE '📄 Other table'
  END as table_info
FROM pg_policies 
WHERE tablename IN ('businesses', 'objects')
  AND schemaname IN ('public', 'storage')
ORDER BY tablename, policyname;

-- Test Summary
SELECT '=== TEST SUMMARY ===' as test;
SELECT 
  'All database tests completed' as status,
  'Check browser console for frontend tests' as next_step,
  'Run manual tests in Admin → Settings → Account → Your Info' as action;
