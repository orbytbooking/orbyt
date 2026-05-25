-- Legacy rows may have is_active NULL. Treat NULL as "active" for existing customers before payment gating.
-- New signups set is_active explicitly to false until Stripe activates them.

UPDATE public.businesses
SET is_active = true
WHERE is_active IS NULL;
