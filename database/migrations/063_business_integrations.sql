-- Store per-business API keys / credentials for third-party integrations (Zapier, MailChimp, etc.)
CREATE TABLE IF NOT EXISTS public.business_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider_slug text NOT NULL,
  api_key text,
  api_secret text,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, provider_slug)
);

COMMENT ON TABLE public.business_integrations IS 'Per-business API keys and config for apps (Zapier, MailChimp, Google Calendar, etc.)';
CREATE INDEX IF NOT EXISTS idx_business_integrations_business_id ON public.business_integrations(business_id);
