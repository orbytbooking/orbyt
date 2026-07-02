-- Business-level reschedule fee settings (Admin > Settings > General > Rescheduling Fees)
CREATE TABLE IF NOT EXISTS public.business_reschedule_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id)
);

CREATE INDEX IF NOT EXISTS idx_business_reschedule_settings_business_id
  ON public.business_reschedule_settings(business_id);

COMMENT ON TABLE public.business_reschedule_settings IS 'Global reschedule fee and policy (fixed $ or percentage %, when to charge)';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reschedule_fee_amount numeric,
  ADD COLUMN IF NOT EXISTS reschedule_fee_currency text;

COMMENT ON COLUMN public.bookings.reschedule_fee_amount IS 'Fee amount applied when booking was rescheduled';
COMMENT ON COLUMN public.bookings.reschedule_fee_currency IS 'Currency symbol for reschedule_fee_amount (e.g. $)';
