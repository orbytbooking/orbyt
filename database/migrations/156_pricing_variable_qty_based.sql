-- Form 3 items only: quantity-based selection with optional maximum.
ALTER TABLE public.industry_form3_items
  ADD COLUMN IF NOT EXISTS qty_based boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maximum_quantity integer;

COMMENT ON COLUMN public.industry_form3_items.qty_based IS
  'Form 3: when true, customers can select a quantity for this item (up to maximum_quantity).';
COMMENT ON COLUMN public.industry_form3_items.maximum_quantity IS
  'Form 3: max quantity when qty_based is true; NULL when not quantity-based.';
