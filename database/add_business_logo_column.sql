-- Add logo_url column to businesses table
-- Run this in your Supabase SQL editor

ALTER TABLE public.businesses ADD COLUMN logo_url text;

-- Add comment to describe the column
COMMENT ON COLUMN public.businesses.logo_url IS 'URL to the business logo image stored in Supabase Storage';

-- Update the businesses table to include logo_url in the select queries
-- The column will store the full path to the image in the storage bucket
