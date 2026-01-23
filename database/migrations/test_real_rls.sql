-- Test RLS with real user context simulation
-- This simulates how RLS works when users are actually logged in

-- Step 1: Get your actual user IDs and business IDs
SELECT 
  'Current Users and Businesses' as info,
  u.id as user_id,
  u.email as user_email,
  b.id as business_id,
  b.name as business_name
FROM auth.users u
JOIN businesses b ON u.id = b.owner_id
ORDER BY u.email;

-- Step 2: Test RLS by setting user context manually
-- This simulates being logged in as different users

-- Test as tech business owner (user_id: 7482de6e-...)
DO $$
DECLARE
  tech_user_id UUID := '7482de6e-'; -- Replace with actual tech owner ID from above
  tech_business_id UUID := '29a941b2-4cb0-4150-89e4-59ec7f0581de';
  customer_count INTEGER;
BEGIN
  -- Set user context (this simulates auth.uid())
  SET LOCAL request.jwt.claim.sub = tech_user_id;
  
  -- Count customers visible to tech business
  SELECT COUNT(*) INTO customer_count 
  FROM customers 
  WHERE business_id = tech_business_id;
  
  RAISE NOTICE 'Tech business can see % customers', customer_count;
END $$;

-- Test as ORBIT business owner (user_id: 7e4602c0-...)
DO $$
DECLARE
  orbit_user_id UUID := '7e4602c0-'; -- Replace with actual ORBIT owner ID from above
  orbit_business_id UUID := '7f0111c3-1e81-487b-acbd-afde24c5f761';
  customer_count INTEGER;
BEGIN
  -- Set user context
  SET LOCAL request.jwt.claim.sub = orbit_user_id;
  
  -- Count customers visible to ORBIT business
  SELECT COUNT(*) INTO customer_count 
  FROM customers 
  WHERE business_id = orbit_business_id;
  
  RAISE NOTICE 'ORBIT business can see % customers', customer_count;
END $$;

-- Step 3: Test the helper function directly
-- This shows what business each user gets
SELECT 
  'Testing get_or_create_current_business function' as test_info,
  email,
  get_or_create_current_business() as business_id
FROM auth.users 
WHERE id IN (
  SELECT owner_id FROM businesses
);

-- Step 4: Show what data each business should see
-- This is the data that RLS should be filtering
SELECT 
  b.name as business_name,
  COUNT(c.id) as total_customers,
  COUNT(CASE WHEN c.business_id = b.id THEN 1 END) as customers_for_this_business,
  COUNT(CASE WHEN c.business_id != b.id THEN 1 END) as customers_from_other_businesses
FROM businesses b
LEFT JOIN customers c ON 1=1  -- Cross join to show all relationships
GROUP BY b.id, b.name
ORDER BY b.name;

-- Step 5: Test RLS policy logic manually
-- This simulates what the RLS policy does
SELECT 
  c.name as customer_name,
  c.email as customer_email,
  c.business_id as customer_business_id,
  b.name as business_name,
  b.owner_id as business_owner,
  'Should be visible to:' as test,
  CASE 
    WHEN c.business_id IN (SELECT id FROM businesses WHERE owner_id = b.owner_id) 
    THEN b.name || ' (owner)'
    ELSE 'NOT ' || b.name
  END as visibility_result
FROM customers c
JOIN businesses b ON 1=1  -- Show all combinations
ORDER BY c.name, b.name
LIMIT 10;

-- Step 6: Check if RLS policies are using the new helper function
SELECT 
  tablename,
  policyname,
  qual as policy_condition
FROM pg_policies 
WHERE tablename IN ('customers', 'bookings', 'services')
AND qual LIKE '%get_or_create_current_business%'
ORDER BY tablename, policyname;

-- Step 7: Verify auth.uid() is working in your context
SELECT 
  'Current authentication context' as context_info,
  auth.uid() as current_user_id,
  current_user as session_user,
  session_user as database_user;
