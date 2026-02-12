-- Create provider_availability table for recurring weekly schedules
CREATE TABLE public.provider_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NULL,
  day_of_week integer NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  is_available boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  business_id uuid NULL,
  effective_date date NULL DEFAULT CURRENT_DATE,
  expiry_date date NULL,
  CONSTRAINT provider_availability_pkey PRIMARY KEY (id),
  CONSTRAINT provider_availability_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses (id),
  CONSTRAINT provider_availability_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES service_providers (id) ON DELETE CASCADE,
  CONSTRAINT provider_availability_day_of_week_check CHECK (
    (day_of_week >= 0) AND (day_of_week <= 6)
  )
) TABLESPACE pg_default;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_provider_availability_provider_id ON public.provider_availability USING btree (provider_id) TABLESPACE pg_default;

-- Enable RLS for provider availability
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider availability
CREATE POLICY "Providers can view their own availability" ON public.provider_availability
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM service_providers WHERE id = provider_id
  ));

CREATE POLICY "Providers can insert their own availability" ON public.provider_availability
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT user_id FROM service_providers WHERE id = provider_id
  ));

CREATE POLICY "Providers can update their own availability" ON public.provider_availability
  FOR UPDATE USING (auth.uid() IN (
    SELECT user_id FROM service_providers WHERE id = provider_id
  ));

CREATE POLICY "Providers can delete their own availability" ON public.provider_availability
  FOR DELETE USING (auth.uid() IN (
    SELECT user_id FROM service_providers WHERE id = provider_id
  ));
