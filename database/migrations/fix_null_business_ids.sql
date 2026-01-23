-- Fix customers with NULL business_id
-- This is the security hole causing cross-business data visibility

-- 1. Update customers with NULL business_id to assign them to a business
-- Replace '7f0111c3-1e81-487b-acbd-afde24c5f761' with your actual business ID
UPDATE customers 
SET business_id = '7f0111c3-1e81-487b-acbd-afde24c5f761'
WHERE business_id IS NULL;

-- 2. Add NOT NULL constraint to prevent this in the future
ALTER TABLE customers ALTER COLUMN business_id SET NOT NULL;

-- 3. Check if bookings also have NULL business_id
SELECT 
  'bookings' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN business_id IS NULL THEN 1 END) as null_business_id,
  COUNT(CASE WHEN business_id IS NOT NULL THEN 1 END) as with_business_id
FROM bookings
UNION ALL
SELECT 
  'customers' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN business_id IS NULL THEN 1 END) as null_business_id,
  COUNT(CASE WHEN business_id IS NOT NULL THEN 1 END) as with_business_id
FROM customers;

-- 4. If bookings have NULL business_id, fix them too
UPDATE bookings 
SET business_id = '7f0111c3-1e81-487b-acbd-afde24c5f761'
WHERE business_id IS NULL;

-- 5. Add NOT NULL constraint to bookings business_id
ALTER TABLE bookings ALTER COLUMN business_id SET NOT NULL;

-- 6. Verify the fix
SELECT 
  c.name,
  c.email,
  c.business_id,
  CASE WHEN c.business_id IS NULL THEN '❌ VISIBLE TO ALL' ELSE '✅ BUSINESS ISOLATED' END as security_status
FROM customers c
ORDER BY c.business_id IS NULL, c.name;

-- 7. Test RLS is now working (this should show 0 rows after the fix)
SELECT COUNT(*) as customers_with_null_business_id 
FROM customers 
WHERE business_id IS NULL;
