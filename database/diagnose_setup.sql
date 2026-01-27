-- Diagnose what's missing after account creation
-- Run this in your Supabase SQL editor

-- Check users and their associated data
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as user_created,
  p.id as profile_id,
  p.full_name,
  p.role as profile_role,
  b.id as business_id,
  b.name as business_name,
  b.owner_id as business_owner
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.businesses b ON u.id = b.owner_id
ORDER BY u.created_at DESC;

-- Check if account settings columns exist
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'businesses') 
  AND table_schema = 'public'
  AND column_name IN (
    'profile_picture', 'bio', 'location',
    'business_email', 'business_phone', 'city', 
    'zip_code', 'website', 'description'
  )
ORDER BY table_name, column_name;
