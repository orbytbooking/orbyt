-- Create industry_frequency table
CREATE TABLE IF NOT EXISTS public.industry_frequency (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  industry_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  different_on_customer_end boolean DEFAULT false,
  show_explanation boolean DEFAULT false,
  enable_popup boolean DEFAULT false,
  display text NOT NULL DEFAULT 'Both' CHECK (display = ANY (ARRAY['Both'::text, 'Booking'::text, 'Quote'::text])),
  occurrence_time text NOT NULL CHECK (occurrence_time = ANY (ARRAY['onetime'::text, 'recurring'::text])),
  discount numeric NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT '%' CHECK (discount_type = ANY (ARRAY['%'::text, '$'::text])),
  is_default boolean DEFAULT false,
  excluded_providers text[] DEFAULT '{}',
  
  -- Dependencies
  add_to_other_industries boolean DEFAULT false,
  enabled_industries text[] DEFAULT '{}',
  show_based_on_location boolean DEFAULT false,
  location_ids text[] DEFAULT '{}',
  service_categories text[] DEFAULT '{}',
  bathroom_variables text[] DEFAULT '{}',
  sqft_variables text[] DEFAULT '{}',
  bedroom_variables text[] DEFAULT '{}',
  exclude_parameters text[] DEFAULT '{}',
  extras text[] DEFAULT '{}',
  
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT industry_frequency_pkey PRIMARY KEY (id),
  CONSTRAINT industry_frequency_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
  CONSTRAINT industry_frequency_industry_id_fkey FOREIGN KEY (industry_id) REFERENCES public.industries(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_industry_frequency_business_id ON public.industry_frequency(business_id);
CREATE INDEX IF NOT EXISTS idx_industry_frequency_industry_id ON public.industry_frequency(industry_id);
CREATE INDEX IF NOT EXISTS idx_industry_frequency_is_active ON public.industry_frequency(is_active);

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
