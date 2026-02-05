-- Marketing Scripts Table
CREATE TABLE IF NOT EXISTS public.marketing_scripts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('Cold Calling', 'Follow-up', 'SMS')),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT marketing_scripts_pkey PRIMARY KEY (id),
  CONSTRAINT marketing_scripts_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

-- Email Campaigns Table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  template text NOT NULL CHECK (template IN ('holiday', 'coupon', 'advertisement', 'custom')),
  recipients text[] NOT NULL DEFAULT '{}',
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT email_campaigns_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_marketing_scripts_business_id ON public.marketing_scripts(business_id);
CREATE INDEX IF NOT EXISTS idx_marketing_scripts_category ON public.marketing_scripts(category);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_business_id ON public.email_campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_sent_at ON public.email_campaigns(sent_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.marketing_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for marketing_scripts
CREATE POLICY "Users can view their own business marketing scripts" ON public.marketing_scripts
  FOR SELECT USING (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own business marketing scripts" ON public.marketing_scripts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can update their own business marketing scripts" ON public.marketing_scripts
  FOR UPDATE USING (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own business marketing scripts" ON public.marketing_scripts
  FOR DELETE USING (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

-- Create RLS policies for email_campaigns
CREATE POLICY "Users can view their own business email campaigns" ON public.email_campaigns
  FOR SELECT USING (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own business email campaigns" ON public.email_campaigns
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can update their own business email campaigns" ON public.email_campaigns
  FOR UPDATE USING (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own business email campaigns" ON public.email_campaigns
  FOR DELETE USING (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

-- Grant permissions
GRANT ALL ON public.marketing_scripts TO authenticated;
GRANT ALL ON public.email_campaigns TO authenticated;
GRANT SELECT ON public.marketing_scripts TO anon;
GRANT SELECT ON public.email_campaigns TO anon;
