-- Platform subscription billing: what businesses pay the platform for their plan.
-- Used by Super Admin dashboard for "Revenue by plan", "Recent subscription payments", "Upcoming renewals".

-- Plan definitions (monthly amount in cents for display; actual billing can be Stripe later)
CREATE TABLE IF NOT EXISTS public.platform_subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  amount_cents integer NOT NULL DEFAULT 0,
  billing_interval text NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT platform_subscription_plans_pkey PRIMARY KEY (id)
);

-- One active subscription per business (links business to plan and period)
CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.platform_subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'trialing', 'past_due')),
  current_period_start date,
  current_period_end date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT platform_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT platform_subscriptions_business_id_key UNIQUE (business_id)
);

-- Payment history: subscription charges paid by businesses to the platform
CREATE TABLE IF NOT EXISTS public.platform_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.platform_subscriptions(id) ON DELETE SET NULL,
  plan_slug text NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  paid_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'refunded', 'failed')),
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT platform_payments_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_business_id ON public.platform_subscriptions (business_id);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_plan_id ON public.platform_subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_current_period_end ON public.platform_subscriptions (current_period_end);
CREATE INDEX IF NOT EXISTS idx_platform_payments_business_id ON public.platform_payments (business_id);
CREATE INDEX IF NOT EXISTS idx_platform_payments_paid_at ON public.platform_payments (paid_at);
CREATE INDEX IF NOT EXISTS idx_platform_payments_plan_slug ON public.platform_payments (plan_slug);

-- Seed plans (idempotent: insert only if missing)
INSERT INTO public.platform_subscription_plans (id, name, slug, amount_cents, billing_interval)
SELECT * FROM (VALUES
  ('a0000001-0001-4000-8000-000000000001'::uuid, 'Starter', 'starter', 0, 'monthly'),
  ('a0000001-0001-4000-8000-000000000002'::uuid, 'Pro', 'pro', 4900, 'monthly'),
  ('a0000001-0001-4000-8000-000000000003'::uuid, 'Enterprise', 'enterprise', 19900, 'monthly')
) AS v(id, name, slug, amount_cents, billing_interval)
WHERE NOT EXISTS (SELECT 1 FROM public.platform_subscription_plans LIMIT 1);

-- Ensure every business has a platform_subscription row (sync from businesses.plan)
INSERT INTO public.platform_subscriptions (business_id, plan_id, status, current_period_start, current_period_end)
SELECT b.id, p.id, 'active', date_trunc('month', b.created_at)::date, (date_trunc('month', b.created_at) + interval '1 month')::date
FROM public.businesses b
CROSS JOIN public.platform_subscription_plans p
WHERE lower(trim(b.plan)) = p.slug
  AND NOT EXISTS (SELECT 1 FROM public.platform_subscriptions s WHERE s.business_id = b.id)
ON CONFLICT (business_id) DO NOTHING;

-- If any business has a plan that doesn't match (e.g. typo), link to starter
INSERT INTO public.platform_subscriptions (business_id, plan_id, status, current_period_start, current_period_end)
SELECT b.id, (SELECT id FROM public.platform_subscription_plans WHERE slug = 'starter' LIMIT 1), 'active', date_trunc('month', b.created_at)::date, (date_trunc('month', b.created_at) + interval '1 month')::date
FROM public.businesses b
WHERE NOT EXISTS (SELECT 1 FROM public.platform_subscriptions s WHERE s.business_id = b.id)
ON CONFLICT (business_id) DO NOTHING;

-- Set current period to this month / next month so "upcoming renewals" show on dashboard
UPDATE public.platform_subscriptions
SET current_period_start = date_trunc('month', now())::date,
    current_period_end = (date_trunc('month', now()) + interval '1 month')::date,
    updated_at = now();

-- Seed recent subscription payments (one per business for current month so revenue-by-plan and recent payments show data)
INSERT INTO public.platform_payments (business_id, subscription_id, plan_slug, amount_cents, paid_at, status, description)
SELECT s.business_id, s.id, p.slug, p.amount_cents, date_trunc('month', now())::timestamp with time zone + interval '1 day', 'paid', 'Subscription – ' || p.name
FROM public.platform_subscriptions s
JOIN public.platform_subscription_plans p ON p.id = s.plan_id
WHERE p.amount_cents > 0
  AND NOT EXISTS (SELECT 1 FROM public.platform_payments pm WHERE pm.business_id = s.business_id AND pm.paid_at >= date_trunc('month', now()));
