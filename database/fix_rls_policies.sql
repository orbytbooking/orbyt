-- Fix RLS policies for businesses and profiles tables
-- Run this in your Supabase SQL editor

-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Users can view own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can insert own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can update own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can delete own businesses" ON public.businesses;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Create proper RLS policies for businesses table
CREATE POLICY "Users can view own businesses" ON public.businesses
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own businesses" ON public.businesses
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own businesses" ON public.businesses
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own businesses" ON public.businesses
  FOR DELETE USING (auth.uid() = owner_id);

-- Create proper RLS policies for profiles table
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- Enable RLS on both tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Test the policies by checking if your user can access their business
SELECT 
  b.id,
  b.name,
  b.owner_id,
  auth.uid() as current_user_id
FROM public.businesses b
WHERE b.owner_id = auth.uid();
