-- Provider payout pause flag for admin provider payments controls.
-- Safe to run multiple times.

ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS payout_paused boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.service_providers.payout_paused IS 'If true, provider is paused from bulk/manual provider payout actions until resumed by admin.';
