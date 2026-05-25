-- Plan feature limits for scaling pricing (Super Admin manages these).
-- NULL = unlimited for numeric limits.

ALTER TABLE public.platform_subscription_plans
  ADD COLUMN IF NOT EXISTS max_calendars integer,
  ADD COLUMN IF NOT EXISTS max_staff_users integer,
  ADD COLUMN IF NOT EXISTS max_bookings_per_month integer,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.platform_subscription_plans.max_calendars IS 'Max calendars/locations per tenant; NULL = unlimited.';
COMMENT ON COLUMN public.platform_subscription_plans.max_staff_users IS 'Max staff/app users (profiles) per tenant; NULL = unlimited.';
COMMENT ON COLUMN public.platform_subscription_plans.max_bookings_per_month IS 'Max bookings per calendar month per tenant; NULL = unlimited.';
COMMENT ON COLUMN public.platform_subscription_plans.is_active IS 'If false, plan is hidden from new checkouts (existing subs unchanged).';
COMMENT ON COLUMN public.platform_subscription_plans.description IS 'Optional marketing / internal notes for the plan.';

-- Sensible defaults for current tiers (adjust in Super Admin anytime)
UPDATE public.platform_subscription_plans
SET
  max_calendars = 1,
  max_staff_users = 5,
  max_bookings_per_month = 200
WHERE slug = 'starter'
  AND max_calendars IS NULL
  AND max_staff_users IS NULL
  AND max_bookings_per_month IS NULL;

UPDATE public.platform_subscription_plans
SET
  max_calendars = 5,
  max_staff_users = 25,
  max_bookings_per_month = 2000
WHERE slug = 'growth'
  AND max_calendars IS NULL
  AND max_staff_users IS NULL
  AND max_bookings_per_month IS NULL;

UPDATE public.platform_subscription_plans
SET
  max_calendars = NULL,
  max_staff_users = NULL,
  max_bookings_per_month = NULL
WHERE slug = 'premium'
  AND max_calendars IS NULL
  AND max_staff_users IS NULL
  AND max_bookings_per_month IS NULL;
