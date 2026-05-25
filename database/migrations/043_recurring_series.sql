-- Recurring booking series: create N ahead, extend on demand (no cron)
-- Each series has a template; bookings link via recurring_series_id

-- 1. Create recurring_series table (template for the series)
CREATE TABLE IF NOT EXISTS public.recurring_series (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text,
  customer_email text,
  customer_phone text,
  -- Template fields (copied to each booking)
  service text,
  address text,
  apt_no text,
  zip_code text,
  notes text,
  total_price numeric DEFAULT 0,
  frequency text NOT NULL,
  frequency_repeats text,
  scheduled_time text,
  duration_minutes integer,
  customization jsonb,
  provider_id uuid REFERENCES public.service_providers(id) ON DELETE SET NULL,
  provider_name text,
  provider_wage numeric,
  provider_wage_type text,
  payment_method text DEFAULT 'cash',
  -- Recurring config
  start_date date NOT NULL,
  end_date date,
  occurrences_ahead integer NOT NULL DEFAULT 8,
  same_provider boolean DEFAULT true,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recurring_series_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_recurring_series_business ON public.recurring_series(business_id);
CREATE INDEX IF NOT EXISTS idx_recurring_series_customer ON public.recurring_series(customer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_series_status ON public.recurring_series(status);

COMMENT ON TABLE public.recurring_series IS 'Template for recurring bookings. Extend creates new booking rows on demand.';

-- 2. Add recurring_series_id to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS recurring_series_id uuid REFERENCES public.recurring_series(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_recurring_series ON public.bookings(recurring_series_id);

COMMENT ON COLUMN public.bookings.recurring_series_id IS 'Links booking to recurring series for extend-on-demand logic';
