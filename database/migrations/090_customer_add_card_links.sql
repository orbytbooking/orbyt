-- Single-use expiring "Add card" links (BookingKoala-style)
CREATE TABLE IF NOT EXISTS public.customer_add_card_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  message text,
  CONSTRAINT customer_add_card_links_pkey PRIMARY KEY (id),
  CONSTRAINT customer_add_card_links_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
  CONSTRAINT customer_add_card_links_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_add_card_links_token ON public.customer_add_card_links(token);
CREATE INDEX IF NOT EXISTS idx_customer_add_card_links_customer ON public.customer_add_card_links(customer_id);

