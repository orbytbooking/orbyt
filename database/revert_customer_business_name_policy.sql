-- Revert the customer business name policy changes
-- This will restore the businesses table to its previous state

-- Step 1: Drop the policy we created
DROP POLICY IF EXISTS "Customers can read their business name" ON public.businesses;

-- Step 2: Ensure the original owner policies exist (recreate if missing)
-- Drop and recreate to ensure they're correct
DROP POLICY IF EXISTS "Users can view own businesses" ON public.businesses;
CREATE POLICY "Users can view own businesses" ON public.businesses
  FOR SELECT USING (auth.uid() = owner_id);

-- Step 3: If the website is still broken, you may need to temporarily disable RLS
-- Uncomment the line below ONLY as a last resort if nothing else works:
-- ALTER TABLE public.businesses DISABLE ROW LEVEL SECURITY;

-- Step 4: Check existing policies to verify everything is correct
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'businesses'
ORDER BY policyname;
