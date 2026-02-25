-- Customer reschedule: allow self-reschedule and message when disabled (General > Store options > Customer > Reschedule)
ALTER TABLE public.business_store_options
  ADD COLUMN IF NOT EXISTS allow_customer_self_reschedule boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reschedule_message text NULL;

COMMENT ON COLUMN public.business_store_options.allow_customer_self_reschedule IS 'When true, customers can reschedule their bookings from their dashboard; when false, they see reschedule_message instead';
COMMENT ON COLUMN public.business_store_options.reschedule_message IS 'HTML message shown to customers when self-reschedule is disabled (e.g. contact admin to reschedule)';
