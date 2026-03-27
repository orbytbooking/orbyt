-- Add API + AI integration feature flags for pricing table.
-- Growth + Premium only (Starter off).

UPDATE public.platform_subscription_plans
SET pricing_features = pricing_features || '{"API integrations": false, "AI automations": false}'::jsonb
WHERE slug = 'starter';

UPDATE public.platform_subscription_plans
SET pricing_features = pricing_features || '{"API integrations": true, "AI automations": true}'::jsonb
WHERE slug = 'growth';

UPDATE public.platform_subscription_plans
SET pricing_features = pricing_features || '{"API integrations": true, "AI automations": true}'::jsonb
WHERE slug = 'premium';

