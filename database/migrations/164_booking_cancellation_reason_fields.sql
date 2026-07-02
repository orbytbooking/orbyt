-- Store cancellation reason + comment on bookings when cancelled

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_reason_id uuid REFERENCES public.cancellation_reasons (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason_label text,
  ADD COLUMN IF NOT EXISTS cancellation_comment text;

CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_reason_id
  ON public.bookings (cancellation_reason_id)
  WHERE cancellation_reason_id IS NOT NULL;

COMMENT ON COLUMN public.bookings.cancellation_reason_id IS 'Selected reason when booking was cancelled.';
COMMENT ON COLUMN public.bookings.cancellation_reason_label IS 'Snapshot of reason label at cancel time.';
COMMENT ON COLUMN public.bookings.cancellation_comment IS 'Optional free-text comment when booking was cancelled.';
