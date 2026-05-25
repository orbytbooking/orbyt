-- Scheduling essentials: spots based on availability, manual/auto assignment,
-- recurring defaults, specific provider, spot limits, holidays

-- 1. New columns on business_store_options
ALTER TABLE public.business_store_options
  ADD COLUMN IF NOT EXISTS spots_based_on_provider_availability boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS provider_assignment_mode text NOT NULL DEFAULT 'automatic'
    CHECK (provider_assignment_mode IN ('manual', 'automatic')),
  ADD COLUMN IF NOT EXISTS recurring_update_default text NOT NULL DEFAULT 'all_future'
    CHECK (recurring_update_default IN ('this_booking_only', 'all_future')),
  ADD COLUMN IF NOT EXISTS specific_provider_for_customers boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS specific_provider_for_admin boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS same_provider_for_recurring_cron boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_minutes_per_provider_per_booking integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spot_limits_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS holiday_skip_to_next boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS holiday_blocked_who text NOT NULL DEFAULT 'customer'
    CHECK (holiday_blocked_who IN ('customer', 'both'));

COMMENT ON COLUMN public.business_store_options.spots_based_on_provider_availability IS
  'Only show booking slots where at least one provider is available';
COMMENT ON COLUMN public.business_store_options.provider_assignment_mode IS
  'manual = all bookings go to unassigned; automatic = use scheduling_type (auto-assign/invite)';
COMMENT ON COLUMN public.business_store_options.recurring_update_default IS
  'Default when editing recurring: this_booking_only or all_future';
COMMENT ON COLUMN public.business_store_options.specific_provider_for_customers IS
  'Allow customers to choose a specific provider on booking form';
COMMENT ON COLUMN public.business_store_options.specific_provider_for_admin IS
  'Allow admin/staff to choose a specific provider when adding booking';
COMMENT ON COLUMN public.business_store_options.same_provider_for_recurring_cron IS
  'When cron creates next recurring booking, reuse same provider';
COMMENT ON COLUMN public.business_store_options.max_minutes_per_provider_per_booking IS
  'Max minutes per provider per booking (0 = disabled)';
COMMENT ON COLUMN public.business_store_options.spot_limits_enabled IS
  'Enforce capacity limits from reserve-slot settings';
COMMENT ON COLUMN public.business_store_options.holiday_skip_to_next IS
  'For recurring: skip holiday and use next available date';
COMMENT ON COLUMN public.business_store_options.holiday_blocked_who IS
  'customer = only customers blocked on holidays; both = admin and customers';

-- 2. Business holidays table (for holiday blocking)
CREATE TABLE IF NOT EXISTS public.business_holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  holiday_date date NOT NULL,
  recurring boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_holidays_pkey PRIMARY KEY (id),
  CONSTRAINT business_holidays_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_business_holidays_business ON public.business_holidays(business_id);
CREATE INDEX IF NOT EXISTS idx_business_holidays_date ON public.business_holidays(business_id, holiday_date);

COMMENT ON TABLE public.business_holidays IS 'Holidays when booking may be blocked or skipped (recurring)';
