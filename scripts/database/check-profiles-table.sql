-- Check if profiles table has profile_picture column
-- Run this in your Supabase SQL editor

-- Check the structure of the profiles table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if profile_picture column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
  AND column_name = 'profile_picture';

-- If profile_picture column doesn't exist, add it:
-- ALTER TABLE public.profiles ADD COLUMN profile_picture text;

-- Check current profiles data
SELECT id, full_name, profile_picture, created_at 
FROM public.profiles 
LIMIT 5;

-- Check if there are any profiles with profile pictures
SELECT COUNT(*) as profiles_with_pictures 
FROM public.profiles 
WHERE profile_picture IS NOT NULL 
  AND profile_picture != '';
