-- Form 3 extras: location visibility filters (frequency & service category deps already exist).
ALTER TABLE public.industry_extras
  ADD COLUMN IF NOT EXISTS show_based_on_location boolean NOT NULL DEFAULT false;

ALTER TABLE public.industry_extras
  ADD COLUMN IF NOT EXISTS location_options text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.industry_form3_extras
  ADD COLUMN IF NOT EXISTS show_based_on_location boolean NOT NULL DEFAULT false;

ALTER TABLE public.industry_form3_extras
  ADD COLUMN IF NOT EXISTS location_options text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.industry_extras.show_based_on_location IS
  'Form 3 extras: when true, this extra is only offered in locations listed in location_options.';
COMMENT ON COLUMN public.industry_extras.location_options IS
  'Location names (match locations.name) when show_based_on_location is true.';
