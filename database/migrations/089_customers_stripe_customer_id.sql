-- Store the Stripe Customer id for a customer profile (for saving cards on file)
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

