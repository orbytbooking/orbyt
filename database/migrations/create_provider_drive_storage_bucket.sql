-- Create storage bucket for provider drive files
-- This script should be run in Supabase SQL Editor

-- Insert bucket configuration into storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-drive-files',
  'provider-drive-files',
  false, -- Private bucket - files are accessed via signed URLs
  52428800, -- 50MB file size limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/x-msvideo'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for provider drive files bucket (with business isolation)
-- Storage path format: {business_id}/{provider_id}/{timestamp}-{filename}
-- This ensures complete business isolation at the storage level

-- Allow providers to upload files to their own business folder
CREATE POLICY "Providers can upload their own business files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'provider-drive-files' AND
  auth.uid() IN (
    SELECT sp.user_id FROM service_providers sp
    WHERE sp.id::text = (storage.foldername(name))[2]
    AND sp.business_id::text = (storage.foldername(name))[1]
  )
);

-- Allow providers to view their own business files
CREATE POLICY "Providers can view their own business files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'provider-drive-files' AND
  auth.uid() IN (
    SELECT sp.user_id FROM service_providers sp
    WHERE sp.id::text = (storage.foldername(name))[2]
    AND sp.business_id::text = (storage.foldername(name))[1]
  )
);

-- Allow providers to update their own business files
CREATE POLICY "Providers can update their own business files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'provider-drive-files' AND
  auth.uid() IN (
    SELECT sp.user_id FROM service_providers sp
    WHERE sp.id::text = (storage.foldername(name))[2]
    AND sp.business_id::text = (storage.foldername(name))[1]
  )
);

-- Allow providers to delete their own business files
CREATE POLICY "Providers can delete their own business files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'provider-drive-files' AND
  auth.uid() IN (
    SELECT sp.user_id FROM service_providers sp
    WHERE sp.id::text = (storage.foldername(name))[2]
    AND sp.business_id::text = (storage.foldername(name))[1]
  )
);
