-- Optional visibility filters for pricing variables (Form 2 "Items" / manage-variables), aligned with extras patterns.
ALTER TABLE public.industry_pricing_variable
  ADD COLUMN IF NOT EXISTS show_based_on_frequency boolean NOT NULL DEFAULT false;

ALTER TABLE public.industry_pricing_variable
  ADD COLUMN IF NOT EXISTS frequency_options text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.industry_pricing_variable
  ADD COLUMN IF NOT EXISTS show_based_on_service_category boolean NOT NULL DEFAULT false;

ALTER TABLE public.industry_pricing_variable
  ADD COLUMN IF NOT EXISTS service_category_options text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.industry_pricing_variable.show_based_on_frequency IS
  'When true, this item is only offered for bookings whose frequency is listed in frequency_options (industry_frequency.name).';
COMMENT ON COLUMN public.industry_pricing_variable.frequency_options IS
  'Frequency names (match industry_frequency.name) when show_based_on_frequency is true.';
COMMENT ON COLUMN public.industry_pricing_variable.show_based_on_service_category IS
  'When true, this item is only offered when the selected service category name is in service_category_options.';
COMMENT ON COLUMN public.industry_pricing_variable.service_category_options IS
  'Service category names (match industry_service_category.name) when show_based_on_service_category is true.';
