-- Create storage bucket for website assets
-- Run this in Supabase Dashboard > SQL Editor

-- Insert storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'website-assets', 
  'website-assets', 
  true, 
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Create policy for authenticated users to upload website assets
CREATE POLICY "Authenticated users can upload website assets" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'website-assets' AND 
  auth.role() IN ('authenticated', 'service_role')
);

-- Create policy for authenticated users to read website assets
CREATE POLICY "Anyone can read website assets" ON storage.objects
FOR SELECT USING (bucket_id = 'website-assets');

-- Create policy for business owners to update their own website assets
CREATE POLICY "Business owners can update their website assets" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'website-assets' AND 
  auth.uid() IN (
    SELECT owner_id FROM businesses 
    WHERE id = (split_part(name, '/', 3)::uuid)
  )
);

-- Create policy for business owners to delete their own website assets
CREATE POLICY "Business owners can delete their website assets" ON storage.objects
FOR DELETE USING (
  bucket_id = 'website-assets' AND 
  auth.uid() IN (
    SELECT owner_id FROM businesses 
    WHERE id = (split_part(name, '/', 3)::uuid)
  )
);
