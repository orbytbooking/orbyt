-- Fix leads table constraints safely
-- This script checks for table existence before adding constraints

-- First, drop problematic foreign key constraints if they exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'leads_assigned_staff_id_fkey' 
        AND table_name = 'leads'
    ) THEN
        ALTER TABLE public.leads DROP CONSTRAINT leads_assigned_staff_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'leads_industry_id_fkey' 
        AND table_name = 'leads'
    ) THEN
        ALTER TABLE public.leads DROP CONSTRAINT leads_industry_id_fkey;
    END IF;
END $$;

-- Add staff foreign key only if staff table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'staff'
    ) THEN
        ALTER TABLE public.leads 
        ADD CONSTRAINT leads_assigned_staff_id_fkey 
        FOREIGN KEY (assigned_staff_id) REFERENCES public.staff(id) 
        ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_leads_assigned_staff_id 
        ON public.leads(assigned_staff_id) 
        WHERE assigned_staff_id IS NOT NULL;
        
        RAISE NOTICE 'Added staff foreign key constraint to leads table';
    ELSE
        RAISE NOTICE 'Staff table not found, skipping staff foreign key constraint';
    END IF;
END $$;

-- Add industry foreign key only if industries table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'industries'
    ) THEN
        ALTER TABLE public.leads 
        ADD CONSTRAINT leads_industry_id_fkey 
        FOREIGN KEY (industry_id) REFERENCES public.industries(id) 
        ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_leads_industry_id 
        ON public.leads(industry_id) 
        WHERE industry_id IS NOT NULL;
        
        RAISE NOTICE 'Added industry foreign key constraint to leads table';
    ELSE
        RAISE NOTICE 'Industries table not found, skipping industry foreign key constraint';
    END IF;
END $$;

-- Ensure basic indexes exist
CREATE INDEX IF NOT EXISTS idx_leads_business_id ON public.leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);

-- Add status check constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'leads_status_check'
    ) THEN
        ALTER TABLE public.leads 
        ADD CONSTRAINT leads_status_check 
        CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost', 'archived'));
    END IF;
END $$;
