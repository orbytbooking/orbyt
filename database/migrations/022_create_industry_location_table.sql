-- Store location dependencies per industry (Frequencies, Service category, Variables, Exclude params, Extras)
CREATE TABLE IF NOT EXISTS public.industry_location (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL,
  industry_id uuid NOT NULL,
  business_id uuid NOT NULL,
  add_to_other_industries boolean DEFAULT false,
  enabled_industry_ids text[] DEFAULT '{}',
  frequency_ids text[] DEFAULT '{}',
  service_category_ids text[] DEFAULT '{}',
  variable_ids text[] DEFAULT '{}',
  exclude_param_ids text[] DEFAULT '{}',
  extra_ids text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT industry_location_pkey PRIMARY KEY (id),
  CONSTRAINT industry_location_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE,
  CONSTRAINT industry_location_industry_id_fkey FOREIGN KEY (industry_id) REFERENCES public.industries(id) ON DELETE CASCADE,
  CONSTRAINT industry_location_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
  CONSTRAINT industry_location_location_industry_unique UNIQUE (location_id, industry_id)
);

CREATE INDEX IF NOT EXISTS idx_industry_location_location_id ON public.industry_location (location_id);
CREATE INDEX IF NOT EXISTS idx_industry_location_industry_id ON public.industry_location (industry_id);

-- Excluded providers per location (providers excluded from this location)
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS excluded_provider_ids text[] DEFAULT '{}';
