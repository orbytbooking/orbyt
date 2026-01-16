-- Test RLS isolation with proper UUIDs
-- This will verify if multi-tenancy is working

-- 1. Get actual business IDs from your database
SELECT 
  id as business_id,
  name as business_name,
  owner_id
FROM businesses;

-- 2. Check if business_id is properly set on customers
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  c.email,
  c.business_id,
  b.name as business_name,
  b.owner_id as business_owner
FROM customers c
JOIN businesses b ON c.business_id = b.id
ORDER BY b.name, c.name;

-- 3. Test RLS by trying to access data with simulated user context
-- Replace 'actual-business-id-1' and 'actual-business-id-2' with real IDs from step 1

-- Test as Business 1 owner (should see only Business 1 data)
-- Run this in your app context, not SQL editor
/*
SET LOCAL request.jwt.claim.sub = 'actual-business-owner-id-1';
SELECT 
  c.name,
  c.email,
  b.name as business_name
FROM customers c
JOIN businesses b ON c.business_id = b.id;
*/

-- 4. Check if RLS policies exist and are properly formatted
SELECT 
  tablename,
  policyname,
  cmd as operation,
  qual as condition
FROM pg_policies 
WHERE tablename IN ('customers', 'bookings', 'services', 'profiles')
ORDER BY tablename, policyname;

-- 5. Verify business_id foreign key constraints exist
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('customers', 'bookings', 'services', 'profiles')
AND kcu.column_name = 'business_id';

-- 6. Test if RLS is actually enforced (this will show the raw data without RLS)
-- The difference between this and what users see proves RLS is working
SELECT 
  (SELECT COUNT(*) FROM customers) as total_customers_in_db,
  (SELECT COUNT(*) FROM customers WHERE business_id IS NOT NULL) as customers_with_business_id;

-- 7. Sample of what RLS should filter
-- This shows all customers that should be filtered by business
SELECT 
  b.name as business,
  COUNT(c.id) as customer_count
FROM businesses b
LEFT JOIN customers c ON b.id = c.business_id
GROUP BY b.id, b.name
ORDER BY b.name;
