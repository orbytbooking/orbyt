-- Verify RLS and triggers are working properly
-- This will show us exactly what's happening

-- Step 1: Check if triggers exist
SELECT 
  'Triggers Status' as info,
  event_object_table as table_name,
  trigger_name,
  CASE 
    WHEN trigger_name LIKE '%auto_set_%_business_id%' THEN '✅ Auto Business ID Trigger'
    ELSE 'Other Trigger'
  END as trigger_type
FROM information_schema.triggers 
WHERE trigger_name LIKE '%auto_set_%_business_id%'
ORDER BY event_object_table;

-- Step 2: Check if RLS policies exist and use the helper function
SELECT 
  'RLS Policies Status' as info,
  tablename,
  policyname,
  CASE 
    WHEN qual LIKE '%get_or_create_current_business%' THEN '✅ Uses Auto Business Function'
    WHEN qual LIKE '%auth.uid()%' THEN '⚠️ Uses auth.uid() directly'
    ELSE '❌ Unknown policy type'
  END as policy_type
FROM pg_policies 
WHERE tablename IN ('customers', 'bookings', 'services')
ORDER BY tablename, policyname;

-- Step 3: Test the helper function directly
SELECT 
  'Helper Function Test' as info,
  email,
  get_or_create_current_business() as assigned_business_id
FROM auth.users 
WHERE id IN (
  SELECT owner_id FROM businesses
)
LIMIT 5;

-- Step 4: Show current data distribution
SELECT 
  'Current Data Distribution' as info,
  b.name as business_name,
  b.owner_id as business_owner,
  COUNT(c.id) as customer_count,
  COUNT(CASE WHEN c.business_id = b.id THEN 1 END) as own_customers,
  COUNT(CASE WHEN c.business_id != b.id THEN 1 END) as other_customers
FROM businesses b
LEFT JOIN customers c ON 1=1
GROUP BY b.id, b.name, b.owner_id
ORDER BY b.name;

-- Step 5: Test what happens when we simulate a user session
-- This simulates being logged in as tech business owner
DO $$
DECLARE
  test_result TEXT;
BEGIN
  -- This is what the trigger does
  BEGIN
    -- Set a temporary user context (this won't actually work in SQL editor)
    -- But we can test the function directly
    test_result := get_or_create_current_business();
    RAISE NOTICE 'Function would assign business_id: %', test_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Function error (expected in SQL editor): %', SQLERRM;
  END;
END $$;

-- Step 6: Check if there are any NULL business_ids remaining
SELECT 
  'NULL business_id Check' as info,
  'customers' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN business_id IS NULL THEN 1 END) as null_business_ids
FROM customers
UNION ALL
SELECT 
  'NULL business_id Check' as info,
  'bookings' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN business_id IS NULL THEN 1 END) as null_business_ids
FROM bookings;

-- Step 7: Show sample data with business context
SELECT 
  'Sample Customer Data' as info,
  c.name,
  c.email,
  c.business_id,
  b.name as business_name,
  CASE 
    WHEN c.business_id = b.id THEN '✅ Correct Business'
    ELSE '❌ Wrong Business'
  END as assignment_status
FROM customers c
JOIN businesses b ON c.business_id = b.id
ORDER BY b.name, c.name
LIMIT 10;

-- Step 8: The real test - check if you can see data you shouldn't
-- This query should return 0 rows if RLS is working
SELECT 
  'RLS Test - Should Return 0 if Working' as info,
  COUNT(*) as cross_business_visible
FROM customers c
WHERE c.business_id != (SELECT id FROM businesses WHERE owner_id = auth.uid() LIMIT 1)
OR NOT EXISTS (SELECT 1 FROM businesses WHERE owner_id = auth.uid());
