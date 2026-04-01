-- Customer portal "My Drive": store flag + file metadata (files in customer-drive-files bucket)
ALTER TABLE public.business_store_options
  ADD COLUMN IF NOT EXISTS customer_my_drive_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.business_store_options.customer_my_drive_enabled IS 'When true, customer portal shows My Drive and APIs allow uploads';

CREATE TABLE IF NOT EXISTS public.customer_drive_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  business_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) > 0),
  type text NOT NULL CHECK (type IN ('folder', 'file')),
  file_type text CHECK (file_type IN ('document', 'image', 'video', 'other')),
  size_bytes bigint,
  storage_path text,
  storage_url text,
  parent_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_drive_files_pkey PRIMARY KEY (id),
  CONSTRAINT customer_drive_files_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers (id) ON DELETE CASCADE,
  CONSTRAINT customer_drive_files_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses (id) ON DELETE CASCADE,
  CONSTRAINT customer_drive_files_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.customer_drive_files (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customer_drive_files_customer_id ON public.customer_drive_files USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_drive_files_business_id ON public.customer_drive_files USING btree (business_id);
CREATE INDEX IF NOT EXISTS idx_customer_drive_files_parent_id ON public.customer_drive_files USING btree (parent_id);

ALTER TABLE public.customer_drive_files ENABLE ROW LEVEL SECURITY;

-- Only service role (API) accesses this table by default; no policies for authenticated role.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-drive-files',
  'customer-drive-files',
  false,
  52428800,
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

-- Path: {business_id}/{customer_id}/{timestamp}-{filename}
DROP POLICY IF EXISTS "Customers can upload their own drive files" ON storage.objects;
CREATE POLICY "Customers can upload their own drive files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'customer-drive-files' AND
  auth.uid() IN (
    SELECT c.auth_user_id FROM public.customers c
    WHERE c.id::text = (storage.foldername(name))[2]
    AND c.business_id::text = (storage.foldername(name))[1]
    AND c.auth_user_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Customers can read their own drive files" ON storage.objects;
CREATE POLICY "Customers can read their own drive files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'customer-drive-files' AND
  auth.uid() IN (
    SELECT c.auth_user_id FROM public.customers c
    WHERE c.id::text = (storage.foldername(name))[2]
    AND c.business_id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Customers can update their own drive files" ON storage.objects;
CREATE POLICY "Customers can update their own drive files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'customer-drive-files' AND
  auth.uid() IN (
    SELECT c.auth_user_id FROM public.customers c
    WHERE c.id::text = (storage.foldername(name))[2]
    AND c.business_id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Customers can delete their own drive files" ON storage.objects;
CREATE POLICY "Customers can delete their own drive files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'customer-drive-files' AND
  auth.uid() IN (
    SELECT c.auth_user_id FROM public.customers c
    WHERE c.id::text = (storage.foldername(name))[2]
    AND c.business_id::text = (storage.foldername(name))[1]
  )
);
