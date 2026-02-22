-- Business spot limits (max bookings per day/week/month) for spot_limits_enabled
CREATE TABLE IF NOT EXISTS public.business_spot_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  max_bookings_per_day integer NOT NULL DEFAULT 10,
  max_bookings_per_week integer NOT NULL DEFAULT 50,
  max_bookings_per_month integer NOT NULL DEFAULT 200,
  max_advance_booking_days integer NOT NULL DEFAULT 90,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_spot_limits_pkey PRIMARY KEY (id),
  CONSTRAINT business_spot_limits_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_spot_limits_business ON public.business_spot_limits(business_id);

COMMENT ON TABLE public.business_spot_limits IS 'Max bookings per day/week/month when spot_limits_enabled in business_store_options';
