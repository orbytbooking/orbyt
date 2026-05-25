-- Scheduling types, provider invitations, time logs
-- Run after existing migrations

-- 1. Business store options (scheduling settings per business)
CREATE TABLE IF NOT EXISTS public.business_store_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  scheduling_type text NOT NULL DEFAULT 'accepted_automatically'
    CHECK (scheduling_type IN ('accepted_automatically', 'accept_or_decline', 'accepts_same_day_only')),
  accept_decline_timeout_minutes integer DEFAULT 60,
  providers_can_see_unassigned boolean DEFAULT true,
  providers_can_see_all_unassigned boolean DEFAULT false,
  notify_providers_on_unassigned boolean DEFAULT true,
  waitlist_enabled boolean DEFAULT false,
  clock_in_out_enabled boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_store_options_pkey PRIMARY KEY (id),
  CONSTRAINT business_store_options_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_store_options_business ON public.business_store_options(business_id);

-- 2. Provider booking invitations (for accept/decline flow)
CREATE TABLE IF NOT EXISTS public.provider_booking_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  business_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  sent_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone,
  response_notes text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT provider_booking_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT provider_booking_invitations_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT provider_booking_invitations_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE,
  CONSTRAINT provider_booking_invitations_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_provider_booking_invitations_booking ON public.provider_booking_invitations(booking_id);
CREATE INDEX IF NOT EXISTS idx_provider_booking_invitations_provider ON public.provider_booking_invitations(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_booking_invitations_status ON public.provider_booking_invitations(status);

-- 3. Booking time logs (clock in/out)
CREATE TABLE IF NOT EXISTS public.booking_time_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  business_id uuid NOT NULL,
  provider_status text NOT NULL DEFAULT 'on_the_way'
    CHECK (provider_status IN ('on_the_way', 'at_location', 'clocked_in', 'lunch_break', 'completed')),
  on_the_way_at timestamp with time zone,
  at_location_at timestamp with time zone,
  clocked_in_at timestamp with time zone,
  clocked_out_at timestamp with time zone,
  lunch_start_at timestamp with time zone,
  lunch_end_at timestamp with time zone,
  travel_distance_km numeric,
  travel_time_minutes numeric,
  time_reported_minutes numeric,
  admin_status text DEFAULT 'pending'
    CHECK (admin_status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  needs_attention boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT booking_time_logs_pkey PRIMARY KEY (id),
  CONSTRAINT booking_time_logs_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT booking_time_logs_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE,
  CONSTRAINT booking_time_logs_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_time_logs_booking ON public.booking_time_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_time_logs_provider ON public.booking_time_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_booking_time_logs_admin_status ON public.booking_time_logs(admin_status);

-- 4. Add unassigned_priority to bookings (Low=green, Medium=orange, High=red)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS unassigned_priority text DEFAULT 'medium'
    CHECK (unassigned_priority IS NULL OR unassigned_priority IN ('low', 'medium', 'high'));

-- 5. Add invitation_id to track how provider got the job (invitation vs grab)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS assignment_source text DEFAULT 'manual'
    CHECK (assignment_source IS NULL OR assignment_source IN ('manual', 'auto', 'invitation', 'grab'));
