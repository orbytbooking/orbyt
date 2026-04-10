-- Workspace list prices: Starter $25, Growth $55, Premium $149 (monthly, cents).
-- Apply after 072_platform_plans_starter_growth_premium.sql; updates existing rows.

UPDATE public.platform_subscription_plans
SET amount_cents = 2500
WHERE slug = 'starter';

UPDATE public.platform_subscription_plans
SET amount_cents = 5500
WHERE slug = 'growth';

UPDATE public.platform_subscription_plans
SET amount_cents = 14900
WHERE slug = 'premium';
