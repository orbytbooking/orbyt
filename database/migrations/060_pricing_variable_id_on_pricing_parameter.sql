-- Link industry_pricing_parameter to industry_pricing_variable (optional FK).
-- variable_category remains the display text; pricing_variable_id ties to the variables table.
ALTER TABLE public.industry_pricing_parameter
  ADD COLUMN IF NOT EXISTS pricing_variable_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'industry_pricing_parameter_pricing_variable_id_fkey'
  ) THEN
    ALTER TABLE public.industry_pricing_parameter
      ADD CONSTRAINT industry_pricing_parameter_pricing_variable_id_fkey
      FOREIGN KEY (pricing_variable_id) REFERENCES public.industry_pricing_variable (id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_industry_pricing_parameter_pricing_variable_id
  ON public.industry_pricing_parameter (pricing_variable_id);

COMMENT ON COLUMN public.industry_pricing_parameter.pricing_variable_id IS 'Optional link to industry_pricing_variable; variable_category is kept in sync for display';
