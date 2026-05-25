-- Create provider availability slots table for specific dates
-- This replaces localStorage-based availability management

CREATE TABLE public.provider_availability_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  slot_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_availability_slots_pkey PRIMARY KEY (id),
  CONSTRAINT provider_availability_slots_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE,
  CONSTRAINT provider_availability_slots_time_check CHECK (end_time > start_time),
  CONSTRAINT provider_availability_slots_unique UNIQUE (provider_id, slot_date, start_time, end_time)
);

-- Enable RLS for provider availability slots
ALTER TABLE public.provider_availability_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider availability slots
CREATE POLICY "Providers can view their own availability slots" ON public.provider_availability_slots
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM service_providers WHERE id = provider_id
  ));

CREATE POLICY "Providers can insert their own availability slots" ON public.provider_availability_slots
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT user_id FROM service_providers WHERE id = provider_id
  ));

CREATE POLICY "Providers can update their own availability slots" ON public.provider_availability_slots
  FOR UPDATE USING (auth.uid() IN (
    SELECT user_id FROM service_providers WHERE id = provider_id
  ));

CREATE POLICY "Providers can delete their own availability slots" ON public.provider_availability_slots
  FOR DELETE USING (auth.uid() IN (
    SELECT user_id FROM service_providers WHERE id = provider_id
  ));

-- Indexes for better performance
CREATE INDEX idx_provider_availability_slots_provider_id ON public.provider_availability_slots(provider_id);
CREATE INDEX idx_provider_availability_slots_date ON public.provider_availability_slots(provider_id, slot_date);
CREATE INDEX idx_provider_availability_slots_datetime ON public.provider_availability_slots(provider_id, slot_date, start_time, end_time);
