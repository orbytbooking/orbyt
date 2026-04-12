-- Optional customer-facing label for service category (admin keeps internal `name` for matching)
ALTER TABLE public.industry_service_category
  ADD COLUMN IF NOT EXISTS different_on_customer_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_end_name text;

COMMENT ON COLUMN public.industry_service_category.different_on_customer_end IS 'When true, use customer_end_name on customer booking UI instead of name';
COMMENT ON COLUMN public.industry_service_category.customer_end_name IS 'Label shown to customers when different_on_customer_end is true';
