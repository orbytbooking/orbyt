-- Add tags column to customers table for customer labeling
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
