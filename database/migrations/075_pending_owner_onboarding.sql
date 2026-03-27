-- Deferred owner signup: store onboarding payload + encrypted password until Stripe Checkout succeeds.
-- Auth user + business are created in the app webhook after payment (see processPendingOwnerCheckout).

CREATE TABLE IF NOT EXISTS public.pending_owner_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_encrypted text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  stripe_checkout_session_id text,
  auth_user_id uuid,
  CONSTRAINT pending_owner_email_lower CHECK (email = lower(trim(email)))
);

CREATE INDEX IF NOT EXISTS idx_pending_owner_unconsumed_email
  ON public.pending_owner_onboarding (lower(email))
  WHERE consumed_at IS NULL;

COMMENT ON TABLE public.pending_owner_onboarding IS
  'Pre-payment owner onboarding; cleared after checkout.session.completed creates auth user + business.';

ALTER TABLE public.pending_owner_onboarding ENABLE ROW LEVEL SECURITY;

-- No GRANT to anon/authenticated — only service role (server) accesses this table.
