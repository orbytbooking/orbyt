-- Add tags and access_blocked to service_providers
ALTER TABLE public.service_providers
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS access_blocked boolean DEFAULT false;

COMMENT ON COLUMN public.service_providers.tags IS 'Labels for organizing and filtering providers';
COMMENT ON COLUMN public.service_providers.access_blocked IS 'When true, provider cannot log into the provider portal';
