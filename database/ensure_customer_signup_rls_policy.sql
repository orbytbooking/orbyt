-- Ensure RLS policy exists for customer signup
-- This allows authenticated users to insert their own customer record during signup

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Allow customer signup" ON public.customers;

-- Create the policy that allows authenticated users to insert their own customer record
-- This is essential for customer self-registration
CREATE POLICY "Allow customer signup"
ON public.customers 
FOR INSERT
WITH CHECK (auth.uid() = auth_user_id);

-- Verify the policy was created
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
WHERE tablename = 'customers' 
AND policyname = 'Allow customer signup';
