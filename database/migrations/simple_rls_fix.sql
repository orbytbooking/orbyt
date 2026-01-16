-- Simple RLS Fix for service_providers table
-- Run this in Supabase SQL Editor

-- Disable RLS on service_providers table
ALTER TABLE service_providers DISABLE ROW LEVEL SECURITY;

-- Confirm RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'service_providers';

-- If you want to re-enable RLS later, run:
-- ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'RLS disabled on service_providers table - admin operations should now work';
END $$;
