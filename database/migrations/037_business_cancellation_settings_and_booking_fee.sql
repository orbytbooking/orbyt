-- Business-level cancellation fee settings (used by Admin > Settings > General > Cancellation)
CREATE TABLE IF NOT EXISTS public.business_cancellation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id)
);

CREATE INDEX IF NOT EXISTS idx_business_cancellation_settings_business_id
  ON public.business_cancellation_settings(business_id);

COMMENT ON TABLE public.business_cancellation_settings IS 'Global cancellation fee and policy (single/multiple fee, when to charge, override service category)';

-- Record applied cancellation fee on the booking when it is cancelled
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_fee_amount numeric,
  ADD COLUMN IF NOT EXISTS cancellation_fee_currency text;

COMMENT ON COLUMN public.bookings.cancellation_fee_amount IS 'Fee amount applied when booking was cancelled (for refund/charge logic)';
COMMENT ON COLUMN public.bookings.cancellation_fee_currency IS 'Currency symbol for cancellation_fee_amount (e.g. $, €)';
