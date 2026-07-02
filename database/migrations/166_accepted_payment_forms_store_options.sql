-- General Settings > Store Info: accepted customer payment methods
ALTER TABLE public.business_store_options
  ADD COLUMN IF NOT EXISTS accepted_payment_credit_card boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accepted_payment_cash_check boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.business_store_options.accepted_payment_credit_card IS 'When true, customers may pay by credit/debit card at checkout';
COMMENT ON COLUMN public.business_store_options.accepted_payment_cash_check IS 'When true, customers may choose cash/check (pay on arrival) at checkout';
