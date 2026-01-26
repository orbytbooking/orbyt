-- Temporarily disable RLS to test if this fixes the issue
-- Run this in your Supabase SQL editor

-- Disable RLS temporarily
ALTER TABLE public.businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Test if you can now access your business
SELECT 
  b.id,
  b.name,
  b.owner_id,
  b.created_at
FROM public.businesses b
WHERE b.owner_id = '22db49cb-133f-4091-8f01-5bbb4893f371';

-- Test profile access
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.created_at
FROM public.profiles p
WHERE p.id = '22db49cb-133f-4091-8f01-5bbb4893f371';

-- Check all existing RLS policies
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
WHERE schemaname = 'public' 
  AND tablename IN ('businesses', 'profiles')
ORDER BY tablename, policyname;
