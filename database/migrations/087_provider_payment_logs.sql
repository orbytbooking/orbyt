-- Provider payout audit logs for admin provider payments page
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS public.provider_payment_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  earnings_count integer NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  payout_date date NOT NULL,
  payout_method text NOT NULL DEFAULT 'manual',
  payout_status text NOT NULL DEFAULT 'completed',
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT provider_payment_logs_pkey PRIMARY KEY (id),
  CONSTRAINT provider_payment_logs_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
  CONSTRAINT provider_payment_logs_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_provider_payment_logs_business_created
  ON public.provider_payment_logs (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_payment_logs_provider_created
  ON public.provider_payment_logs (provider_id, created_at DESC);

COMMENT ON TABLE public.provider_payment_logs IS 'Immutable payout log entries for provider payments (manual or automated).';
