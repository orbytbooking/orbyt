-- Add more role options to the profiles table
-- Run this in your Supabase SQL editor

-- First, check the current constraint
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass AND contype = 'c';

-- Drop the existing constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add a new constraint with more role options
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['customer'::text, 'provider'::text, 'admin'::text, 'owner'::text, 'manager'::text, 'staff'::text]));

-- Verify the change
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass AND contype = 'c';
