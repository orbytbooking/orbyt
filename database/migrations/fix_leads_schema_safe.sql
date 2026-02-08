-- Safe leads table schema without problematic foreign key dependencies
-- Drop existing table if it exists
DROP TABLE IF EXISTS public.leads CASCADE;

-- Create leads table with minimal dependencies
CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tags text[] DEFAULT '{}',
  status text DEFAULT 'new',
  business_id uuid NOT NULL,
  assigned_staff_id uuid,
  industry_id uuid,
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT leads_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_leads_business_id ON public.leads(business_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_created_at ON public.leads(created_at);

-- Add check constraint for status
ALTER TABLE public.leads 
ADD CONSTRAINT leads_status_check 
CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost', 'archived'));

-- Optional: Add foreign key constraints only if referenced tables exist
-- Uncomment these lines if you're sure the tables exist:
-- ALTER TABLE public.leads 
-- ADD CONSTRAINT leads_assigned_staff_id_fkey FOREIGN KEY (assigned_staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;
-- ALTER TABLE public.leads 
-- ADD CONSTRAINT leads_industry_id_fkey FOREIGN KEY (industry_id) REFERENCES public.industries(id) ON DELETE SET NULL;

-- Create indexes for foreign key columns only if constraints are added
-- CREATE INDEX idx_leads_assigned_staff_id ON public.leads(assigned_staff_id) WHERE assigned_staff_id IS NOT NULL;
-- CREATE INDEX idx_leads_industry_id ON public.leads(industry_id) WHERE industry_id IS NOT NULL;
