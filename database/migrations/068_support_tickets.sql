-- Support tickets for Super Admin: tenants (businesses) submit requests; super admins view and manage.

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  requester_email text,
  assigned_to text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_business_id ON public.support_tickets (business_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets (created_at DESC);

COMMENT ON TABLE public.support_tickets IS 'Platform support tickets from businesses; managed by super admins.';
