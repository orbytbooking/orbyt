-- Starter was capped at 1 location in 077; raise so normal onboarding/testing can add multiple locations.
UPDATE public.platform_subscription_plans
SET max_calendars = 5
WHERE slug = 'starter';
