-- Marketing-aligned plans: Starter $19, Growth $49, Premium $110 (monthly, cents)
-- Slugs: starter | growth | premium (replaces pro → growth, enterprise → premium)

UPDATE public.businesses SET plan = 'growth' WHERE lower(trim(plan)) = 'pro';
UPDATE public.businesses SET plan = 'premium' WHERE lower(trim(plan)) = 'enterprise';

UPDATE public.platform_payments SET plan_slug = 'growth' WHERE plan_slug = 'pro';
UPDATE public.platform_payments SET plan_slug = 'premium' WHERE plan_slug = 'enterprise';

UPDATE public.platform_subscription_plans
SET name = 'Starter', amount_cents = 1900
WHERE slug = 'starter';

UPDATE public.platform_subscription_plans
SET name = 'Growth', slug = 'growth', amount_cents = 4900
WHERE slug = 'pro';

UPDATE public.platform_subscription_plans
SET name = 'Premium', slug = 'premium', amount_cents = 11000
WHERE slug = 'enterprise';
