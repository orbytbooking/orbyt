-- Parity with industry_pricing_parameter: optional extras / service categories tied to this exclude row.
ALTER TABLE public.industry_exclude_parameter
  ADD COLUMN IF NOT EXISTS excluded_extras text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS excluded_services text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.industry_exclude_parameter.excluded_extras IS 'industry_extras.id values excluded for this parameter';
COMMENT ON COLUMN public.industry_exclude_parameter.excluded_services IS 'industry_service_category.id values excluded for this parameter';
