-- Check if profile exists and create if missing
-- Run this in your Supabase SQL editor

-- First, check what users exist
SELECT 
  u.id, 
  u.email, 
  u.created_at,
  p.id as profile_id,
  p.full_name,
  p.role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- If profile is missing, create it (replace with your actual user ID)
INSERT INTO public.profiles (id, full_name, phone, role, is_active, business_id, created_at, updated_at)
SELECT 
  u.id,
  u.raw_user_meta_data->>'full_name' as full_name,
  u.raw_user_meta_data->>'phone' as phone,
  'admin' as role,
  true,
  b.id as business_id,
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN public.businesses b ON u.id = b.owner_id
WHERE u.id = 'YOUR-USER-ID'  -- Replace with your actual user ID
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
  );
