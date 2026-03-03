-- Store customer profile extras (contacts, addresses) in DB instead of localStorage
-- customers table already has: company, first_name, last_name, gender, notes, sms_reminders

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS contacts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS addresses jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.customers.contacts IS 'Array of { name, email, phone } for additional contacts';
COMMENT ON COLUMN public.customers.addresses IS 'Array of { id, aptNo, location, zip, isDefault } for saved addresses';
