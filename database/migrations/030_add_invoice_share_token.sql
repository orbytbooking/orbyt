-- Add share token for public invoice view and send link
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

-- Generate tokens for existing invoices
UPDATE public.invoices
SET share_token = gen_random_uuid()::text
WHERE share_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_share_token ON public.invoices (share_token) WHERE share_token IS NOT NULL;
