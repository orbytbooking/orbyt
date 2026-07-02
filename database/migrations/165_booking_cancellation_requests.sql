-- Customer cancellation requests pending admin approval

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_request_status text
    CHECK (
      cancellation_request_status IS NULL
      OR cancellation_request_status IN ('pending', 'approved', 'rejected')
    ),
  ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS pending_cancellation_occurrence_dates text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_request_pending
  ON public.bookings (business_id, cancellation_requested_at DESC)
  WHERE cancellation_request_status = 'pending';

COMMENT ON COLUMN public.bookings.cancellation_request_status IS
  'pending = customer requested cancel awaiting admin; approved/rejected are terminal audit states.';
COMMENT ON COLUMN public.bookings.pending_cancellation_occurrence_dates IS
  'Recurring occurrence dates requested for cancel but not yet approved by admin.';
