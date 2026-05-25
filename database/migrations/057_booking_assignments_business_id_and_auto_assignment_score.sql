-- Add business_id and auto_assignment_score to booking_assignments for dashboard filtering and auto-assign
ALTER TABLE public.booking_assignments
ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.booking_assignments
ADD COLUMN IF NOT EXISTS auto_assignment_score numeric;

COMMENT ON COLUMN public.booking_assignments.business_id IS 'Denormalized from booking for efficient admin dashboard filtering';
COMMENT ON COLUMN public.booking_assignments.auto_assignment_score IS 'Score used when assignment was auto-created';

-- Backfill business_id from bookings where missing
UPDATE public.booking_assignments ba
SET business_id = b.business_id
FROM public.bookings b
WHERE ba.booking_id = b.id AND (ba.business_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_booking_assignments_business_id ON public.booking_assignments(business_id);
