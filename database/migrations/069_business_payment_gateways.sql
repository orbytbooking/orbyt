-- Per-business payment gateway configuration (classic gateway pattern)
-- Each business can connect its own gateway account (e.g. Authorize.Net).

CREATE TABLE IF NOT EXISTS public.business_payment_gateways (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  -- Which gateway this row is for (we start with Authorize.Net but allow others)
  provider text NOT NULL CHECK (provider IN ('stripe', 'square', 'paypal', 'authorize_net')),

  -- Common enable/disable + health status
  enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected', 'disconnected', 'error', 'pending')),
  last_checked_at timestamp with time zone,
  last_error text,

  -- Authorize.Net specific fields
  -- Store sensitive values encrypted at the application layer.
  api_login_id text,
  transaction_key_encrypted text,
  public_client_key_encrypted text,

  -- 'test' or 'live' so you can sandbox vs production
  environment text NOT NULL DEFAULT 'test' CHECK (environment IN ('test', 'live')),

  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  CONSTRAINT business_payment_gateways_pkey PRIMARY KEY (id),
  CONSTRAINT business_payment_gateways_business_provider_key
    UNIQUE (business_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_business_payment_gateways_business_id
  ON public.business_payment_gateways (business_id);

CREATE INDEX IF NOT EXISTS idx_business_payment_gateways_provider
  ON public.business_payment_gateways (provider);

