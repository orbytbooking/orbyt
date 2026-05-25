-- Persist per-tenant default: when adding an industry, whether to apply Form 1 starter rows (frequencies, categories, pricing, etc.).
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS default_seed_form1_template boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.businesses.default_seed_form1_template IS
  'If true, new industries default to seeding Form 1 template data unless the client overrides seed_form1_template on POST /api/industries.';
