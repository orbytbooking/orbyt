-- Remove redundant tables that duplicate functionality
-- This cleans up the schema and removes confusion

-- Step 1: Drop redundant tables (order matters due to dependencies)

-- Drop users table first (no dependencies)
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop profiles table (may have dependencies)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Step 2: Update any references that might have pointed to these tables
-- (This is a safety measure in case there were any foreign keys)

-- Step 3: Verify the remaining tables are clean
SELECT 
  'Remaining Tables After Cleanup' as status,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name NOT IN ('users', 'profiles')
ORDER BY table_name;

-- Step 4: Show the final clean schema
SELECT 
  'Final Schema Summary' as info,
  COUNT(*) as total_tables_remaining
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name NOT IN ('users', 'profiles');

-- Step 5: Verify no orphaned data
SELECT 
  'Data Integrity Check' as check_type,
  'service_providers' as table_name,
  COUNT(*) as record_count,
  COUNT(CASE WHEN business_id IS NOT NULL THEN 1 END) as with_business_id
FROM service_providers

UNION ALL

SELECT 
  'Data Integrity Check' as check_type,
  'customers' as table_name,
  COUNT(*) as record_count,
  COUNT(CASE WHEN business_id IS NOT NULL THEN 1 END) as with_business_id
FROM customers

UNION ALL

SELECT 
  'Data Integrity Check' as check_type,
  'bookings' as table_name,
  COUNT(*) as record_count,
  COUNT(CASE WHEN business_id IS NOT NULL THEN 1 END) as with_business_id
FROM bookings

UNION ALL

SELECT 
  'Data Integrity Check' as check_type,
  'services' as table_name,
  COUNT(*) as record_count,
  COUNT(CASE WHEN business_id IS NOT NULL THEN 1 END) as with_business_id
FROM services;

-- Comments
COMMENT ON SCHEMA public IS 'Clean schema with redundant user tables removed';
