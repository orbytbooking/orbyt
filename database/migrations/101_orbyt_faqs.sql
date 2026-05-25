-- Per-business FAQs (replaces browser localStorage key orbyt_faqs for tenant data).

CREATE TABLE IF NOT EXISTS public.orbyt_faqs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT orbyt_faqs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_orbyt_faqs_business_id ON public.orbyt_faqs (business_id);
CREATE INDEX IF NOT EXISTS idx_orbyt_faqs_business_sort ON public.orbyt_faqs (business_id, sort_order);

COMMENT ON TABLE public.orbyt_faqs IS 'FAQ items for a business website and AI receptionist; scoped by business_id.';
