-- Add provider priority for invitation order (Booking Koala: Set Priority)
ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS invitation_priority integer DEFAULT 0;

COMMENT ON COLUMN public.service_providers.invitation_priority IS 'Higher = invited first for accept/decline scheduling. Admin sets via Set Priority.';
