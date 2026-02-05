-- Create industry_frequency table
CREATE TABLE IF NOT EXISTS public.industry_frequency (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  industry_id uuid NOT NULL,
  name text NOT NULL,
  description text NULL,
  different_on_customer_end boolean NULL DEFAULT false,
  show_explanation boolean NULL DEFAULT false,
  enable_popup boolean NULL DEFAULT false,
  display text NOT NULL DEFAULT 'Both'::text,
  occurrence_time text NOT NULL,
  discount numeric NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT '%'::text,
  is_default boolean NULL DEFAULT false,
  excluded_providers text[] NULL DEFAULT '{}'::text[],
  
  -- Dependencies
  add_to_other_industries boolean NULL DEFAULT false,
  enabled_industries text[] NULL DEFAULT '{}'::text[],
  show_based_on_location boolean NULL DEFAULT false,
  location_ids text[] NULL DEFAULT '{}'::text[],
  service_categories text[] NULL DEFAULT '{}'::text[],
  bathroom_variables text[] NULL DEFAULT '{}'::text[],
  sqft_variables text[] NULL DEFAULT '{}'::text[],
  bedroom_variables text[] NULL DEFAULT '{}'::text[],
  exclude_parameters text[] NULL DEFAULT '{}'::text[],
  extras text[] NULL DEFAULT '{}'::text[],
  
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  
  CONSTRAINT industry_frequency_pkey PRIMARY KEY (id),
  CONSTRAINT industry_frequency_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses (id) ON DELETE CASCADE,
  CONSTRAINT industry_frequency_industry_id_fkey FOREIGN KEY (industry_id) REFERENCES public.industries (id) ON DELETE CASCADE,
  CONSTRAINT industry_frequency_discount_type_check CHECK (
    (discount_type = ANY (ARRAY['%'::text, '$'::text]))
  ),
  CONSTRAINT industry_frequency_display_check CHECK (
    (
      display = ANY (
        ARRAY['Both'::text, 'Booking'::text, 'Quote'::text]
      )
    )
  ),
  CONSTRAINT industry_frequency_occurrence_time_check CHECK (
    (
      occurrence_time = ANY (ARRAY['onetime'::text, 'recurring'::text])
    )
  )
) TABLESPACE pg_default;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_industry_frequency_business_id ON public.industry_frequency USING btree (business_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_industry_frequency_industry_id ON public.industry_frequency USING btree (industry_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_industry_frequency_is_active ON public.industry_frequency USING btree (is_active) TABLESPACE pg_default;

-- Add RLS policies
ALTER TABLE public.industry_frequency ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view frequencies for their business
CREATE POLICY "Users can view frequencies for their business" ON public.industry_frequency
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert frequencies for their business
CREATE POLICY "Users can insert frequencies for their business" ON public.industry_frequency
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can update frequencies for their business
CREATE POLICY "Users can update frequencies for their business" ON public.industry_frequency
  FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete frequencies for their business
CREATE POLICY "Users can delete frequencies for their business" ON public.industry_frequency
  FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Add comment
COMMENT ON TABLE public.industry_frequency IS 'Stores frequency options for industries with their configurations and dependencies';
