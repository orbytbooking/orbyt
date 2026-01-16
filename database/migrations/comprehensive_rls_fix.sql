-- Comprehensive RLS fix - check all tables and policies
-- This will identify exactly why multi-tenancy isn't working

-- 1. Check all tables for NULL business_id
SELECT 
  'customers' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN business_id IS NULL THEN 1 END) as null_business_id,
  COUNT(CASE WHEN business_id IS NOT NULL THEN 1 END) as with_business_id
FROM customers
UNION ALL
SELECT 
  'bookings' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN business_id IS NULL THEN 1 END) as null_business_id,
  COUNT(CASE WHEN business_id IS NOT NULL THEN 1 END) as with_business_id
FROM bookings
UNION ALL
SELECT 
  'services' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN business_id IS NULL THEN 1 END) as null_business_id,
  COUNT(CASE WHEN business_id IS NOT NULL THEN 1 END) as with_business_id
FROM services
UNION ALL
SELECT 
  'profiles' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN business_id IS NULL THEN 1 END) as null_business_id,
  COUNT(CASE WHEN business_id IS NOT NULL THEN 1 END) as with_business_id
FROM profiles;

-- 2. Check if RLS is actually enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('customers', 'bookings', 'services', 'profiles', 'leads', 'staff', 'coupons')
ORDER BY tablename;

-- 3. Check what RLS policies exist
SELECT 
  tablename,
  policyname,
  cmd as operation,
  qual as condition
FROM pg_policies 
WHERE tablename IN ('customers', 'bookings', 'services', 'profiles')
ORDER BY tablename, policyname;

-- 4. Test if RLS policies are working by checking policy logic
-- This shows what the policies are actually checking
SELECT 
  'RLS Policy Test' as test_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'customers' 
      AND qual LIKE '%auth.uid()%'
    ) THEN '✅ Customers policy uses auth.uid()'
    ELSE '❌ Customers policy missing auth.uid()'
  END as customers_policy,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'bookings' 
      AND qual LIKE '%auth.uid()%'
    ) THEN '✅ Bookings policy uses auth.uid()'
    ELSE '❌ Bookings policy missing auth.uid()'
  END as bookings_policy;

-- 5. Check if your frontend is actually using the customers table or some other table
-- Look for any table that might be storing customer data
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('customers', 'users', 'profiles', 'service_providers')
AND column_name IN ('name', 'email', 'phone')
ORDER BY table_name, column_name;

-- 6. Check if there are any duplicate customer tables
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND (table_name LIKE '%customer%' OR table_name LIKE '%user%')
ORDER BY table_name;

-- 7. Test the actual RLS policy condition manually
-- This simulates what the RLS policy should do
SELECT 
  c.name,
  c.email,
  c.business_id,
  b.owner_id,
  CASE 
    WHEN c.business_id IN (SELECT id FROM businesses WHERE owner_id = 'test-user-id') 
    THEN 'VISIBLE TO USER'
    ELSE 'HIDDEN FROM USER'
  END as rls_result
FROM customers c
JOIN businesses b ON c.business_id = b.id
LIMIT 5;

-- 8. Check if your app is using the correct table
-- Maybe your frontend is reading from a different table
SELECT 
  'All customer-like tables' as info,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name LIKE '%customer%'
ORDER BY table_name;
