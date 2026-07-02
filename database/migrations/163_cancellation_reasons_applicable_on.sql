-- Add "Applicable on" flags to cancellation reasons (Add reason modal)

ALTER TABLE public.cancellation_reasons
  ADD COLUMN IF NOT EXISTS applicable_cancel_all_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS applicable_cancel_single boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS applicable_exclude_cancellation_fee boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS applicable_exclude_after_first_fee boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.cancellation_reasons.applicable_cancel_all_recurring IS
  'Reason shown when cancelling all recurring appointments.';
COMMENT ON COLUMN public.cancellation_reasons.applicable_cancel_single IS
  'Reason shown when cancelling a single appointment.';
COMMENT ON COLUMN public.cancellation_reasons.applicable_exclude_cancellation_fee IS
  'Reason shown when excluding cancellation fee.';
COMMENT ON COLUMN public.cancellation_reasons.applicable_exclude_after_first_fee IS
  'Reason shown when excluding cancellation after 1st appointment fee.';
