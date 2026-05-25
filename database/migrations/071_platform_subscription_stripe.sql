-- Stripe integration for platform (Orbyt) subscriptions: link Stripe Customer/Subscription/Invoice to our rows.

ALTER TABLE public.platform_subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_price_id text;

COMMENT ON COLUMN public.platform_subscription_plans.stripe_price_id IS
  'Stripe Price ID (price_...) for Checkout subscription mode; optional if using env STRIPE_PLATFORM_PRICE_<SLUG>.';

ALTER TABLE public.platform_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

COMMENT ON COLUMN public.platform_subscriptions.stripe_customer_id IS 'Stripe Customer paying the platform.';
COMMENT ON COLUMN public.platform_subscriptions.stripe_subscription_id IS 'Stripe Subscription id (sub_...).';

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_subscriptions_stripe_subscription_id
  ON public.platform_subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.platform_payments
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text;

COMMENT ON COLUMN public.platform_payments.stripe_invoice_id IS 'Stripe Invoice id (in_...) for idempotent webhook inserts.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_payments_stripe_invoice_id
  ON public.platform_payments (stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;
