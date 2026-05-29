-- Track manual "Send Schedule" notifications from admin bookings.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS schedule_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS schedule_sent_to text;

COMMENT ON COLUMN public.bookings.schedule_sent_at IS 'When the provider schedule email/SMS was last sent for this booking.';
COMMENT ON COLUMN public.bookings.schedule_sent_to IS 'Recipient (email or phone) used for the last schedule send.';
