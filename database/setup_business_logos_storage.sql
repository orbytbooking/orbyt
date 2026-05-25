-- Setup storage bucket for business logos
-- Run this in your Supabase SQL editor

-- Create the storage bucket for business logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-logos',
  'business-logos',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create Row Level Security policies for the bucket
-- Allow authenticated users to upload logos for their own businesses
CREATE POLICY "Users can upload logos for their businesses"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'business-logos' AND
  auth.role() = 'authenticated' AND
  -- Extract business_id from the file path (first part of the path) and cast to UUID
  (split_part(name, '/', 1))::text IN (
    SELECT id::text FROM businesses WHERE owner_id = auth.uid()
  )
);

-- Allow users to update their own business logos
CREATE POLICY "Users can update their business logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'business-logos' AND
  auth.role() = 'authenticated' AND
  -- Extract business_id from the file path (first part of the path) and cast to UUID
  (split_part(name, '/', 1))::text IN (
    SELECT id::text FROM businesses WHERE owner_id = auth.uid()
  )
);

-- Allow public access to read logos (since they're public business images)
CREATE POLICY "Public can view business logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'business-logos');

-- Allow users to delete their own business logos
CREATE POLICY "Users can delete their business logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'business-logos' AND
  auth.role() = 'authenticated' AND
  -- Extract business_id from the file path (first part of the path) and cast to UUID
  (split_part(name, '/', 1))::text IN (
    SELECT id::text FROM businesses WHERE owner_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;

-- Create a function to check if a user owns a business
CREATE OR REPLACE FUNCTION user_owns_business(business_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM businesses 
    WHERE id = business_uuid AND owner_id = auth.uid()
  );
$$;

-- Create a function to get public URL for business logo
CREATE OR REPLACE FUNCTION get_business_logo_url(business_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN logo_url IS NOT NULL AND logo_url != '' THEN logo_url
      ELSE NULL
    END
  FROM businesses 
  WHERE id = business_uuid;
$$;
