-- Add quantity-based settings to industry_exclude_parameter (same concept as industry_extras)
-- Enables "Quantity based", "Maximum", and "Apply to all bookings" in the exclude parameter form.

ALTER TABLE public.industry_exclude_parameter
  ADD COLUMN IF NOT EXISTS qty_based boolean NOT NULL DEFAULT false;

ALTER TABLE public.industry_exclude_parameter
  ADD COLUMN IF NOT EXISTS maximum_quantity integer;

ALTER TABLE public.industry_exclude_parameter
  ADD COLUMN IF NOT EXISTS apply_to_all_bookings boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.industry_exclude_parameter.qty_based IS 'Whether price/selection is quantity-based';
COMMENT ON COLUMN public.industry_exclude_parameter.maximum_quantity IS 'Max quantity allowed (NULL = unlimited)';
COMMENT ON COLUMN public.industry_exclude_parameter.apply_to_all_bookings IS 'When true, apply this parameter to all bookings; when false, first only';
