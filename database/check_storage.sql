-- Check if storage bucket exists and show current policies
-- Run this in your Supabase SQL editor to verify storage setup

-- Check if the avatars bucket exists
SELECT * FROM storage.buckets WHERE name = 'avatars';

-- Check existing RLS policies for storage objects
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Show all storage objects (if any)
SELECT * FROM storage.objects WHERE bucket_id = 'avatars';

-- If bucket doesn't exist, run this:
INSERT INTO storage.buckets (id, name, public)
VALUES (
  'avatars',
  'avatars',
  true
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public;

-- If policies don't exist, run these:
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can view their own avatar"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);
