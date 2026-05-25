-- Customer-facing labels for industry pricing variables (Manage Variables), matching service category pattern.
ALTER TABLE public.industry_pricing_variable
  ADD COLUMN IF NOT EXISTS different_on_customer_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_end_name text;

COMMENT ON COLUMN public.industry_pricing_variable.different_on_customer_end IS 'When true, use customer_end_name on customer booking UI instead of name for this variable category';
COMMENT ON COLUMN public.industry_pricing_variable.customer_end_name IS 'Label shown to customers for this variable category when different_on_customer_end is true';
