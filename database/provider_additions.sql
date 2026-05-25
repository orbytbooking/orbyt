-- ========================================
-- Minimal additions
-- ========================================
-- Add essential tables for scheduling and provider management

-- 1. PROVIDER PAY RATES (CRITICAL)
CREATE TABLE IF NOT EXISTS public.provider_pay_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  service_id uuid,
  rate_type text NOT NULL DEFAULT 'flat' CHECK (rate_type IN ('flat', 'percentage', 'hourly')),
  flat_rate numeric,
  percentage_rate numeric CHECK (percentage_rate >= 0 AND percentage_rate <= 100),
  hourly_rate numeric,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_pay_rates_pkey PRIMARY KEY (id),
  CONSTRAINT provider_pay_rates_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE,
  CONSTRAINT provider_pay_rates_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE
);

-- 2. PROVIDER EARNINGS (CRITICAL)
CREATE TABLE IF NOT EXISTS public.provider_earnings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  booking_id uuid NOT NULL,
  service_id uuid NOT NULL,
  gross_amount numeric NOT NULL,
  commission_rate numeric,
  commission_amount numeric NOT NULL,
  net_amount numeric NOT NULL,
  pay_rate_type text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed')),
  payout_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_earnings_pkey PRIMARY KEY (id),
  CONSTRAINT provider_earnings_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE,
  CONSTRAINT provider_earnings_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT provider_earnings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE
);

-- 3. BOOKING ASSIGNMENTS (CRITICAL)
CREATE TABLE IF NOT EXISTS public.booking_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  assignment_type text NOT NULL DEFAULT 'manual' CHECK (assignment_type IN ('manual', 'auto')),
  assigned_by uuid,
  assigned_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'declined', 'reassigned', 'cancelled')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT booking_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT booking_assignments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT booking_assignments_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE
);

-- 4. PROVIDER CAPACITY (IMPORTANT)
CREATE TABLE IF NOT EXISTS public.provider_capacity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  max_concurrent_bookings integer DEFAULT 1,
  max_daily_bookings integer DEFAULT 8,
  max_weekly_bookings integer DEFAULT 40,
  current_workload numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_capacity_pkey PRIMARY KEY (id),
  CONSTRAINT provider_capacity_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE
);

-- 5. PROVIDER SERVICE AREAS (IMPORTANT)
CREATE TABLE IF NOT EXISTS public.provider_service_areas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  area_name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text,
  postal_code text,
  latitude numeric,
  longitude numeric,
  radius_km numeric DEFAULT 10,
  is_primary_area boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_service_areas_pkey PRIMARY KEY (id),
  CONSTRAINT provider_service_areas_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE
);

-- 6. PROVIDER PREFERENCES (IMPORTANT)
CREATE TABLE IF NOT EXISTS public.provider_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  auto_assignments boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  advance_booking_days integer DEFAULT 7,
  minimum_booking_notice_hours integer DEFAULT 2,
  accepts_emergency_bookings boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT provider_preferences_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE
);

-- 7. PROVIDER REVIEWS (IMPORTANT)
CREATE TABLE IF NOT EXISTS public.provider_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  booking_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  is_public boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT provider_reviews_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE,
  CONSTRAINT provider_reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT provider_reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE
);

-- ========================================
-- ENHANCE EXISTING TABLES
-- ========================================

-- Add missing columns to service_providers
ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payout_method text DEFAULT 'bank_transfer' CHECK (payout_method IN ('bank_transfer', 'stripe', 'paypal', 'cash')),
ADD COLUMN IF NOT EXISTS total_earned numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_paid_out numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS availability_status text DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'unavailable', 'on_vacation'));

-- Add missing columns to provider_services
ALTER TABLE public.provider_services 
ADD COLUMN IF NOT EXISTS skill_level text DEFAULT 'basic' CHECK (skill_level IN ('basic', 'intermediate', 'advanced', 'expert')),
ADD COLUMN IF NOT EXISTS is_primary_service boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS years_experience integer DEFAULT 0;

-- Add missing columns to provider_availability
ALTER TABLE public.provider_availability 
ADD COLUMN IF NOT EXISTS effective_date date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS expiry_date date;

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_provider_pay_rates_provider_id ON public.provider_pay_rates(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_earnings_provider_id ON public.provider_earnings(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_earnings_booking_id ON public.provider_earnings(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_booking_id ON public.booking_assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_provider_id ON public.booking_assignments(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_capacity_provider_id ON public.provider_capacity(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_service_areas_provider_id ON public.provider_service_areas(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_preferences_provider_id ON public.provider_preferences(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_reviews_provider_id ON public.provider_reviews(provider_id);

-- ========================================
-- TRIGGERS FOR AUTOMATIC EARNINGS
-- ========================================
CREATE OR REPLACE FUNCTION calculate_provider_earnings()
RETURNS TRIGGER AS $$
BEGIN
  -- When booking is completed, calculate provider earnings
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.provider_id IS NOT NULL THEN
    -- Get provider pay rate for this service
    DECLARE
      pay_rate RECORD;
      commission_amount numeric;
      net_amount numeric;
    BEGIN
      SELECT * INTO pay_rate 
      FROM public.provider_pay_rates 
      WHERE provider_id = NEW.provider_id 
      AND (service_id IS NULL OR service_id = NEW.service_id)
      AND is_active = true
      LIMIT 1;
      
      IF pay_rate.id IS NOT NULL THEN
        -- Calculate earnings based on rate type
        IF pay_rate.rate_type = 'flat' THEN
          commission_amount := COALESCE(pay_rate.flat_rate, 0);
        ELSIF pay_rate.rate_type = 'percentage' THEN
          commission_amount := COALESCE(NEW.total_price, 0) * (COALESCE(pay_rate.percentage_rate, 0) / 100);
        ELSIF pay_rate.rate_type = 'hourly' THEN
          -- Assuming 1 hour per booking for simplicity
          commission_amount := COALESCE(pay_rate.hourly_rate, 0);
        END IF;
        
        net_amount := commission_amount;
        
        -- Create earnings record
        INSERT INTO public.provider_earnings (
          provider_id, 
          booking_id, 
          service_id, 
          gross_amount, 
          commission_rate, 
          commission_amount, 
          net_amount, 
          pay_rate_type
        ) VALUES (
          NEW.provider_id,
          NEW.id,
          NEW.service_id,
          NEW.total_price,
          CASE 
            WHEN pay_rate.rate_type = 'percentage' THEN pay_rate.percentage_rate
            ELSE NULL
          END,
          commission_amount,
          net_amount,
          pay_rate.rate_type
        );
        
        -- Update provider totals
        UPDATE public.service_providers 
        SET 
          total_earned = total_earned + commission_amount,
          current_balance = current_balance + commission_amount,
          updated_at = NOW()
        WHERE id = NEW.provider_id;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_provider_earnings
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_provider_earnings();

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================
-- This would be removed in production
-- INSERT INTO public.provider_capacity (provider_id, max_concurrent_bookings, max_daily_bookings)
-- SELECT id, 2, 6 FROM public.service_providers LIMIT 5;

-- INSERT INTO public.provider_preferences (provider_id, auto_assignments, email_notifications)
-- SELECT id, true, true FROM public.service_providers LIMIT 5;
