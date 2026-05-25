-- Add a billing_cards jsonb column to store manually added customer cards
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS billing_cards jsonb DEFAULT '[]'::jsonb;

