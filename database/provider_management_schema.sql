-- ========================================
-- Provider management schema
-- ========================================
-- This schema adds the missing tables for complete provider management
-- Run this after the main schema to add provider-specific features

-- ========================================
-- 1. PROVIDER SERVICES & SKILLS
-- ========================================
CREATE TABLE public.provider_services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  service_id uuid NOT NULL,
  skill_level text DEFAULT 'basic' CHECK (skill_level IN ('basic', 'intermediate', 'advanced', 'expert')),
  is_primary_service boolean DEFAULT false,
  years_experience integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_services_pkey PRIMARY KEY (id),
  CONSTRAINT provider_services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE,
  CONSTRAINT provider_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE,
  UNIQUE(provider_id, service_id)
);

-- ========================================
-- 2. PROVIDER PAY RATES & COMMISSIONS
-- ========================================
CREATE TABLE public.provider_pay_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  service_id uuid,
  rate_type text NOT NULL DEFAULT 'flat' CHECK (rate_type IN ('flat', 'percentage', 'hourly')),
  flat_rate numeric,
  percentage_rate numeric CHECK (percentage_rate >= 0 AND percentage_rate <= 100),
  hourly_rate numeric,
  minimum_rate numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  effective_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_pay_rates_pkey PRIMARY KEY (id),
  CONSTRAINT provider_pay_rates_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE,
  CONSTRAINT provider_pay_rates_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE
);

-- ========================================
-- 3. PROVIDER SERVICE AREAS
-- ========================================
CREATE TABLE public.provider_service_areas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  area_name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text,
  postal_code text,
  country text DEFAULT 'US',
  latitude numeric,
  longitude numeric,
  radius_km numeric DEFAULT 10, -- Service radius in kilometers
  is_primary_area boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_service_areas_pkey PRIMARY KEY (id),
  CONSTRAINT provider_service_areas_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE
);

-- ========================================
-- 4. PROVIDER AVAILABILITY SCHEDULES
-- ========================================
CREATE TABLE public.provider_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  effective_date date DEFAULT CURRENT_DATE,
  expiry_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_availability_pkey PRIMARY KEY (id),
  CONSTRAINT provider_availability_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE,
  CONSTRAINT provider_availability_time_check CHECK (end_time > start_time)
);

-- ========================================
-- 5. PROVIDER CAPACITY & WORKLOAD
-- ========================================
CREATE TABLE public.provider_capacity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  max_concurrent_bookings integer DEFAULT 1,
  max_daily_bookings integer DEFAULT 8,
  max_weekly_bookings integer DEFAULT 40,
  preferred_working_hours numeric DEFAULT 40, -- hours per week
  current_workload numeric DEFAULT 0, -- current workload percentage
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_capacity_pkey PRIMARY KEY (id),
  CONSTRAINT provider_capacity_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE
);

-- ========================================
-- 6. BOOKING ASSIGNMENTS
-- ========================================
CREATE TABLE public.booking_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  assignment_type text NOT NULL DEFAULT 'manual' CHECK (assignment_type IN ('manual', 'auto')),
  assigned_by uuid, -- Admin user ID for manual assignments
  assigned_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'declined', 'reassigned', 'cancelled')),
  acceptance_notes text,
  auto_assignment_score numeric, -- Score for auto-assignment algorithm
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT booking_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT booking_assignments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT booking_assignments_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE
);

-- ========================================
-- 7. PROVIDER EARNINGS & PAYOUTS
-- ========================================
CREATE TABLE public.provider_earnings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  booking_id uuid NOT NULL,
  service_id uuid NOT NULL,
  gross_amount numeric NOT NULL,
  commission_rate numeric,
  commission_amount numeric NOT NULL,
  net_amount numeric NOT NULL,
  pay_rate_type text NOT NULL,
  flat_rate_used numeric,
  percentage_rate_used numeric,
  hourly_rate_used numeric,
  hours_worked numeric DEFAULT 1,
  tips_amount numeric DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed')),
  payout_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_earnings_pkey PRIMARY KEY (id),
  CONSTRAINT provider_earnings_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE,
  CONSTRAINT provider_earnings_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT provider_earnings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE
);

-- ========================================
-- 8. PROVIDER PAYOUT BATCHES
-- ========================================
CREATE TABLE public.provider_payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  batch_name text NOT NULL,
  total_earnings numeric NOT NULL,
  total_commission numeric NOT NULL,
  total_tips numeric DEFAULT 0,
  total_payout numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  payout_method text DEFAULT 'bank_transfer' CHECK (payout_method IN ('bank_transfer', 'stripe', 'paypal', 'cash')),
  payout_date date,
  processed_date timestamp with time zone,
  transaction_id text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_payouts_pkey PRIMARY KEY (id),
  CONSTRAINT provider_payouts_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE
);

-- ========================================
-- 9. PROVIDER PAYOUT EARNINGS LINK
-- ========================================
CREATE TABLE public.payout_earnings (
  payout_id uuid NOT NULL,
  earning_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payout_earnings_pkey PRIMARY KEY (payout_id, earning_id),
  CONSTRAINT payout_earnings_payout_id_fkey FOREIGN KEY (payout_id) REFERENCES public.provider_payouts(id) ON DELETE CASCADE,
  CONSTRAINT payout_earnings_earning_id_fkey FOREIGN KEY (earning_id) REFERENCES public.provider_earnings(id) ON DELETE CASCADE
);

-- ========================================
-- 10. PROVIDER PERFORMANCE METRICS
-- ========================================
CREATE TABLE public.provider_performance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  period_type text NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_bookings integer DEFAULT 0,
  completed_bookings integer DEFAULT 0,
  cancelled_bookings integer DEFAULT 0,
  total_earnings numeric DEFAULT 0,
  average_rating numeric DEFAULT 0,
  total_reviews integer DEFAULT 0,
  on_time_percentage numeric DEFAULT 0,
  customer_satisfaction_score numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_performance_pkey PRIMARY KEY (id),
  CONSTRAINT provider_performance_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE),
  UNIQUE(provider_id, period_type, period_start)
);

-- ========================================
-- 11. PROVIDER PREFERENCES
-- ========================================
CREATE TABLE public.provider_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  auto_assignments boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  push_notifications boolean DEFAULT true,
  advance_booking_days integer DEFAULT 7,
  minimum_booking_notice_hours integer DEFAULT 2,
  accepts_emergency_bookings boolean DEFAULT false,
  preferred_payment_methods text[] DEFAULT ARRAY['bank_transfer'],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT provider_preferences_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE
);

-- ========================================
-- 12. PROVIDER REVIEWS
-- ========================================
CREATE TABLE public.provider_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  booking_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  is_public boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  response_text text,
  responded_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT provider_reviews_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE,
  CONSTRAINT provider_reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT provider_reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE
);

-- ========================================
-- 13. AUTO-ASSIGNMENT RULES
-- ========================================
CREATE TABLE public.assignment_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('availability', 'location', 'services', 'capacity', 'rating', 'priority')),
  priority integer DEFAULT 1, -- Higher number = higher priority
  conditions jsonb NOT NULL, -- Rule conditions as JSON
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assignment_rules_pkey PRIMARY KEY (id),
  CONSTRAINT assignment_rules_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

-- ========================================
-- 14. ASSIGNMENT LOGS
-- ========================================
CREATE TABLE public.assignment_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  provider_id uuid,
  action text NOT NULL, -- 'assigned', 'unassigned', 'accepted', 'declined', 'completed'
  reason text,
  assignment_score numeric,
  rule_applied text,
  assigned_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assignment_logs_pkey PRIMARY KEY (id),
  CONSTRAINT assignment_logs_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT assignment_logs_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX idx_provider_services_provider_id ON public.provider_services(provider_id);
CREATE INDEX idx_provider_services_service_id ON public.provider_services(service_id);
CREATE INDEX idx_provider_pay_rates_provider_id ON public.provider_pay_rates(provider_id);
CREATE INDEX idx_provider_pay_rates_service_id ON public.provider_pay_rates(service_id);
CREATE INDEX idx_provider_service_areas_provider_id ON public.provider_service_areas(provider_id);
CREATE INDEX idx_provider_service_areas_location ON public.provider_service_areas USING GIST (point(longitude, latitude));
CREATE INDEX idx_provider_availability_provider_id ON public.provider_availability(provider_id);
CREATE INDEX idx_provider_availability_schedule ON public.provider_availability(provider_id, day_of_week, start_time, end_time);
CREATE INDEX idx_booking_assignments_booking_id ON public.booking_assignments(booking_id);
CREATE INDEX idx_booking_assignments_provider_id ON public.booking_assignments(provider_id);
CREATE INDEX idx_booking_assignments_status ON public.booking_assignments(status);
CREATE INDEX idx_provider_earnings_provider_id ON public.provider_earnings(provider_id);
CREATE INDEX idx_provider_earnings_booking_id ON public.provider_earnings(booking_id);
CREATE INDEX idx_provider_earnings_status ON public.provider_earnings(status);
CREATE INDEX idx_provider_payouts_provider_id ON public.provider_payouts(provider_id);
CREATE INDEX idx_provider_payouts_status ON public.provider_payouts(status);
CREATE INDEX idx_provider_performance_provider_id ON public.provider_performance(provider_id);
CREATE INDEX idx_provider_reviews_provider_id ON public.provider_reviews(provider_id);
CREATE INDEX idx_provider_reviews_rating ON public.provider_reviews(rating);
CREATE INDEX idx_assignment_rules_business_id ON public.assignment_rules(business_id);
CREATE INDEX idx_assignment_logs_booking_id ON public.assignment_logs(booking_id);

-- ========================================
-- TRIGGERS FOR UPDATING PROVIDER STATS
-- ========================================
CREATE OR REPLACE FUNCTION update_provider_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update completed jobs count when booking is completed
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.service_providers 
    SET completed_jobs = completed_jobs + 1,
        updated_at = NOW()
    WHERE id = NEW.provider_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_provider_stats
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_stats();

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================
-- This would be removed in production
-- INSERT INTO public.provider_services (provider_id, service_id, skill_level) 
-- SELECT 'provider-uuid-here', id, 'intermediate' FROM public.services LIMIT 5;

-- INSERT INTO public.provider_capacity (provider_id, max_concurrent_bookings, max_daily_bookings)
-- SELECT id, 2, 6 FROM public.service_providers;

-- INSERT INTO public.provider_preferences (provider_id, auto_assignments, email_notifications)
-- SELECT id, true, true FROM public.service_providers;
