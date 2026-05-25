-- Create industry_exclude_parameter table with excluded_providers column
-- This table stores exclude parameters for pricing with provider exclusions

CREATE TABLE public.industry_exclude_parameter (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  industry_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  price numeric NOT NULL DEFAULT 0,
  time_minutes integer NOT NULL DEFAULT 0,
  display text NOT NULL DEFAULT 'Customer Frontend, Backend & Admin' CHECK (display = ANY (ARRAY['Customer Frontend, Backend & Admin'::text, 'Customer Backend & Admin'::text, 'Admin Only'::text])),
  service_category text,
  frequency text,
  show_based_on_frequency boolean NOT NULL DEFAULT false,
  show_based_on_service_category boolean NOT NULL DEFAULT false,
  excluded_providers text[] DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT industry_exclude_parameter_pkey PRIMARY KEY (id),
  CONSTRAINT industry_exclude_parameter_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX idx_industry_exclude_parameter_business_id ON public.industry_exclude_parameter(business_id);
CREATE INDEX idx_industry_exclude_parameter_industry_id ON public.industry_exclude_parameter(industry_id);
CREATE INDEX idx_industry_exclude_parameter_sort_order ON public.industry_exclude_parameter(sort_order);

-- Add RLS policies
ALTER TABLE public.industry_exclude_parameter ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see exclude parameters for their own business
CREATE POLICY "Users can view exclude parameters for their business" ON public.industry_exclude_parameter
  FOR SELECT USING (auth.uid() IN (
    SELECT owner_id FROM public.businesses WHERE id = business_id
  ));

-- Policy: Users can insert exclude parameters for their own business
CREATE POLICY "Users can insert exclude parameters for their business" ON public.industry_exclude_parameter
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT owner_id FROM public.businesses WHERE id = business_id
  ));

-- Policy: Users can update exclude parameters for their own business
CREATE POLICY "Users can update exclude parameters for their business" ON public.industry_exclude_parameter
  FOR UPDATE USING (auth.uid() IN (
    SELECT owner_id FROM public.businesses WHERE id = business_id
  ));

-- Policy: Users can delete exclude parameters for their own business
CREATE POLICY "Users can delete exclude parameters for their business" ON public.industry_exclude_parameter
  FOR DELETE USING (auth.uid() IN (
    SELECT owner_id FROM public.businesses WHERE id = business_id
  ));

-- Add comments for documentation
COMMENT ON TABLE public.industry_exclude_parameter IS 'Stores exclude parameters for pricing with provider exclusions';
COMMENT ON COLUMN public.industry_exclude_parameter.excluded_providers IS 'Array of provider IDs that should be excluded from this parameter';
