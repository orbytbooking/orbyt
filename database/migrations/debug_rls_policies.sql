-- Debug RLS policies - check what's actually enabled
-- Run this to see the current state

-- 1. Check if RLS is enabled on tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('customers', 'bookings', 'services', 'profiles', 'leads', 'staff', 'coupons');

-- 2. Check existing RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public';

-- 3. Check if auth.uid() is working (run this while logged in)
SELECT 
  auth.uid() as current_user_id,
  current_user as session_user;

-- 4. Test business ownership
SELECT 
  b.id as business_id,
  b.name as business_name,
  b.owner_id,
  auth.uid() as current_user_id,
  CASE WHEN b.owner_id = auth.uid() THEN 'OWNER' ELSE 'NOT_OWNER' END as ownership_status
FROM businesses b;

-- 5. Test customer access with current user
SELECT 
  c.id,
  c.name,
  c.email,
  c.business_id,
  b.owner_id,
  auth.uid() as current_user_id,
  CASE WHEN c.business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()) 
       THEN 'SHOULD_SEE' 
       ELSE 'SHOULD_NOT_SEE' 
  END as access_status
FROM customers c
JOIN businesses b ON c.business_id = b.id;

-- 6. Check if business_id is actually set on your test data
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
FROM bookings;

-- 7. Show sample data with business context
SELECT 
  c.name,
  c.email,
  c.business_id,
  b.name as business_name,
  b.owner_id as business_owner,
  auth.uid() as current_user
FROM customers c
LEFT JOIN businesses b ON c.business_id = b.id
LIMIT 5;
