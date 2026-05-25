-- Location visibility filters for pricing variables / Form 2–3 items (aligned with frequency & service category deps).
ALTER TABLE public.industry_pricing_variable
  ADD COLUMN IF NOT EXISTS show_based_on_location boolean NOT NULL DEFAULT false;

ALTER TABLE public.industry_pricing_variable
  ADD COLUMN IF NOT EXISTS location_options text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.industry_pricing_variable.show_based_on_location IS
  'When true, this item is only offered for bookings in locations listed in location_options (locations.name).';
COMMENT ON COLUMN public.industry_pricing_variable.location_options IS
  'Location names (match locations.name) when show_based_on_location is true.';

ALTER TABLE public.industry_form2_items
  ADD COLUMN IF NOT EXISTS show_based_on_location boolean NOT NULL DEFAULT false;
ALTER TABLE public.industry_form2_items
  ADD COLUMN IF NOT EXISTS location_options text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.industry_form3_items
  ADD COLUMN IF NOT EXISTS show_based_on_location boolean NOT NULL DEFAULT false;
ALTER TABLE public.industry_form3_items
  ADD COLUMN IF NOT EXISTS location_options text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.industry_form4_variables
  ADD COLUMN IF NOT EXISTS show_based_on_location boolean NOT NULL DEFAULT false;
ALTER TABLE public.industry_form4_variables
  ADD COLUMN IF NOT EXISTS location_options text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.industry_form5_variables
  ADD COLUMN IF NOT EXISTS show_based_on_location boolean NOT NULL DEFAULT false;
ALTER TABLE public.industry_form5_variables
  ADD COLUMN IF NOT EXISTS location_options text[] NOT NULL DEFAULT '{}'::text[];
