-- Pricing variables per industry (replaces localStorage pricingVariables_${industry})
-- Used by Manage Variables and Pricing Parameter forms.
CREATE TABLE IF NOT EXISTS public.industry_pricing_variable (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  industry_id uuid NOT NULL,
  business_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT industry_pricing_variable_pkey PRIMARY KEY (id),
  CONSTRAINT industry_pricing_variable_industry_id_fkey FOREIGN KEY (industry_id) REFERENCES public.industries(id) ON DELETE CASCADE,
  CONSTRAINT industry_pricing_variable_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_industry_pricing_variable_industry_id ON public.industry_pricing_variable (industry_id);
CREATE INDEX IF NOT EXISTS idx_industry_pricing_variable_business_id ON public.industry_pricing_variable (business_id);

COMMENT ON TABLE public.industry_pricing_variable IS 'Variable categories for pricing parameters (e.g. Sq Ft, Bedroom, Bathroom) per industry';
