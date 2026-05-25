-- Location settings (Booking Koala-style): how locations are managed and wildcard zip
ALTER TABLE public.business_store_options
  ADD COLUMN IF NOT EXISTS location_management text NOT NULL DEFAULT 'zip'
    CHECK (location_management IN ('zip', 'name', 'none')),
  ADD COLUMN IF NOT EXISTS wildcard_zip_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.business_store_options.location_management IS 'zip = collect zip/postal code; name = city/town name; none = no location on form';
COMMENT ON COLUMN public.business_store_options.wildcard_zip_enabled IS 'When true, match locations by zip prefix (e.g. A1A matches A1A 1A1)';
