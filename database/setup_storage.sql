-- Create storage bucket for profile pictures
-- Run this in your Supabase SQL editor

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES (
  'avatars',
  'avatars',
  true
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public;

-- Set up RLS policies for the bucket
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
