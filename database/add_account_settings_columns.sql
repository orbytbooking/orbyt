-- Add missing columns for account settings functionality
-- Run this in your Supabase SQL editor

-- Add columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_picture text,
ADD COLUMN IF NOT EXISTS bio text CHECK (length(bio) <= 500),
ADD COLUMN IF NOT EXISTS location text;

-- Add columns to businesses table  
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS business_email character varying,
ADD COLUMN IF NOT EXISTS business_phone character varying,
ADD COLUMN IF NOT EXISTS city character varying,
ADD COLUMN IF NOT EXISTS zip_code character varying,
ADD COLUMN IF NOT EXISTS website character varying,
ADD COLUMN IF NOT EXISTS description text;

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'businesses') 
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
