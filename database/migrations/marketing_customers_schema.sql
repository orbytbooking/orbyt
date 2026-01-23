-- Marketing Customers Table for Supabase (with multitenancy)
CREATE TABLE IF NOT EXISTS marketing_customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    address text,
    join_date date,
    total_bookings integer DEFAULT 0,
    total_spent numeric DEFAULT 0,
    status text NOT NULL CHECK (status IN ('active', 'inactive')),
    last_booking date,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_customers_business_id ON marketing_customers(business_id);
CREATE INDEX IF NOT EXISTS idx_marketing_customers_email ON marketing_customers(email);

ALTER TABLE marketing_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers are isolated by business" ON marketing_customers
    USING (auth.uid() IS NOT NULL AND business_id = current_setting('request.jwt.claims', true)::json->>'business_id');
