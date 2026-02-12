-- Create provider_drive_files table for storing file metadata
CREATE TABLE IF NOT EXISTS public.provider_drive_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  business_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('folder', 'file')),
  file_type text CHECK (file_type IN ('document', 'image', 'video', 'other')),
  size_bytes bigint,
  storage_path text, -- Path in Supabase storage bucket
  storage_url text, -- Public URL for the file
  parent_id uuid NULL, -- null means root folder, uuid references another provider_drive_files.id
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT provider_drive_files_pkey PRIMARY KEY (id),
  CONSTRAINT provider_drive_files_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES service_providers (id) ON DELETE CASCADE,
  CONSTRAINT provider_drive_files_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE,
  CONSTRAINT provider_drive_files_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES provider_drive_files (id) ON DELETE CASCADE,
  CONSTRAINT provider_drive_files_name_not_empty CHECK (char_length(name) > 0)
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_provider_drive_files_provider_id ON public.provider_drive_files USING btree (provider_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_provider_drive_files_business_id ON public.provider_drive_files USING btree (business_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_provider_drive_files_parent_id ON public.provider_drive_files USING btree (parent_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_provider_drive_files_type ON public.provider_drive_files USING btree (type) TABLESPACE pg_default;

-- Enable RLS for provider drive files
ALTER TABLE public.provider_drive_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotent migrations)
DROP POLICY IF EXISTS "Providers can view their own files" ON public.provider_drive_files;
DROP POLICY IF EXISTS "Providers can insert their own files" ON public.provider_drive_files;
DROP POLICY IF EXISTS "Providers can update their own files" ON public.provider_drive_files;
DROP POLICY IF EXISTS "Providers can delete their own files" ON public.provider_drive_files;
DROP POLICY IF EXISTS "Providers can view their own business files" ON public.provider_drive_files;
DROP POLICY IF EXISTS "Providers can insert their own business files" ON public.provider_drive_files;
DROP POLICY IF EXISTS "Providers can update their own business files" ON public.provider_drive_files;
DROP POLICY IF EXISTS "Providers can delete their own business files" ON public.provider_drive_files;

-- RLS Policies for provider drive files (with business isolation)
CREATE POLICY "Providers can view their own business files" ON public.provider_drive_files
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM service_providers 
      WHERE id = provider_id 
      AND business_id = provider_drive_files.business_id
    )
  );

CREATE POLICY "Providers can insert their own business files" ON public.provider_drive_files
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM service_providers 
      WHERE id = provider_id 
      AND business_id = provider_drive_files.business_id
    )
  );

CREATE POLICY "Providers can update their own business files" ON public.provider_drive_files
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM service_providers 
      WHERE id = provider_id 
      AND business_id = provider_drive_files.business_id
    )
  );

CREATE POLICY "Providers can delete their own business files" ON public.provider_drive_files
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM service_providers 
      WHERE id = provider_id 
      AND business_id = provider_drive_files.business_id
    )
  );

-- Function to validate parent folder belongs to same business
CREATE OR REPLACE FUNCTION validate_parent_business()
RETURNS TRIGGER AS $$
BEGIN
  -- If parent_id is NULL, it's a root folder - allow it
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if parent exists and belongs to same business
  IF NOT EXISTS (
    SELECT 1 FROM provider_drive_files 
    WHERE id = NEW.parent_id 
    AND business_id = NEW.business_id
    AND provider_id = NEW.provider_id
  ) THEN
    RAISE EXCEPTION 'Parent folder must belong to the same business and provider';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (for idempotent migrations)
DROP TRIGGER IF EXISTS validate_parent_business_trigger ON public.provider_drive_files;

-- Trigger to validate parent business before insert/update
CREATE TRIGGER validate_parent_business_trigger
  BEFORE INSERT OR UPDATE ON public.provider_drive_files
  FOR EACH ROW
  EXECUTE FUNCTION validate_parent_business();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_provider_drive_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (for idempotent migrations)
DROP TRIGGER IF EXISTS update_provider_drive_files_updated_at ON public.provider_drive_files;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_provider_drive_files_updated_at
  BEFORE UPDATE ON public.provider_drive_files
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_drive_files_updated_at();
