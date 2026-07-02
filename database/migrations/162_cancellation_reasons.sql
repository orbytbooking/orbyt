-- Cancellation reasons for admin General > Store options > Cancellation (Manage reasons modal)

CREATE TABLE IF NOT EXISTS public.cancellation_reasons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  applies_one_time boolean NOT NULL DEFAULT true,
  applies_recurring boolean NOT NULL DEFAULT true,
  applicable_cancel_all_recurring boolean NOT NULL DEFAULT false,
  applicable_cancel_single boolean NOT NULL DEFAULT false,
  applicable_exclude_cancellation_fee boolean NOT NULL DEFAULT false,
  applicable_exclude_after_first_fee boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cancellation_reasons_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_cancellation_reasons_business_id
  ON public.cancellation_reasons (business_id);

CREATE INDEX IF NOT EXISTS idx_cancellation_reasons_business_order
  ON public.cancellation_reasons (business_id, display_order);

COMMENT ON TABLE public.cancellation_reasons IS
  'Cancellation reason options shown when cancelling bookings; managed in General settings.';
