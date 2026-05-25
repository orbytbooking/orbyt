-- Platform (Orbyt SaaS) billing via Authorize.Net: ARB subscription + CIM profiles.

ALTER TABLE public.platform_subscriptions
  ADD COLUMN IF NOT EXISTS authorize_net_customer_profile_id text,
  ADD COLUMN IF NOT EXISTS authorize_net_payment_profile_id text,
  ADD COLUMN IF NOT EXISTS authorize_net_subscription_id text;

COMMENT ON COLUMN public.platform_subscriptions.authorize_net_customer_profile_id IS
  'Authorize.Net CIM customer profile id when platform billing uses Authorize.Net (ARB).';
COMMENT ON COLUMN public.platform_subscriptions.authorize_net_payment_profile_id IS
  'Authorize.Net CIM payment profile id for recurring platform charges.';
COMMENT ON COLUMN public.platform_subscriptions.authorize_net_subscription_id IS
  'Authorize.Net ARB subscription id (platform plan).';

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_subscriptions_authorize_net_sub_id
  ON public.platform_subscriptions (authorize_net_subscription_id)
  WHERE authorize_net_subscription_id IS NOT NULL;

ALTER TABLE public.platform_payments
  ADD COLUMN IF NOT EXISTS authorize_net_trans_id text;

COMMENT ON COLUMN public.platform_payments.authorize_net_trans_id IS
  'Authorize.Net transaction id for idempotent platform payment rows.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_payments_authorize_net_trans_id
  ON public.platform_payments (authorize_net_trans_id)
  WHERE authorize_net_trans_id IS NOT NULL;

-- Pending Accept Hosted session: correlates invoiceNumber (token) to business or deferred owner signup.
CREATE TABLE IF NOT EXISTS public.platform_authorize_net_checkout_sessions (
  token text NOT NULL CHECK (char_length(token) <= 20),
  business_id uuid REFERENCES public.businesses (id) ON DELETE CASCADE,
  pending_owner_id uuid REFERENCES public.pending_owner_onboarding (id) ON DELETE CASCADE,
  plan_slug text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  billing_interval text NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT platform_authorize_net_checkout_sessions_pkey PRIMARY KEY (token),
  CONSTRAINT platform_authorize_net_checkout_sessions_target_chk CHECK (
    (business_id IS NOT NULL AND pending_owner_id IS NULL)
    OR (business_id IS NULL AND pending_owner_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_platform_authnet_checkout_pending_owner
  ON public.platform_authorize_net_checkout_sessions (pending_owner_id)
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_platform_authnet_checkout_business
  ON public.platform_authorize_net_checkout_sessions (business_id)
  WHERE completed_at IS NULL;

COMMENT ON TABLE public.platform_authorize_net_checkout_sessions IS
  'In-flight Orbyt platform plan checkouts via Authorize.Net Accept Hosted (invoiceNumber = token).';
