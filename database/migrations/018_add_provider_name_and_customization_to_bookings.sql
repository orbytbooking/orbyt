-- Add provider_name for display when provider_id join is null (e.g. from book-now selection)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS provider_name text;

COMMENT ON COLUMN public.bookings.provider_name IS 'Display name of assigned provider (e.g. from book-now form or admin assign).';

-- Add customization JSONB for variable categories, extras, area/bedroom/bathroom (booking summary / view details)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS customization jsonb;

COMMENT ON COLUMN public.bookings.customization IS 'Booking customization: variableCategories, extras, squareMeters, bedroom, bathroom, etc.';
