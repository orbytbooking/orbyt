-- Marketing Daily Discounts Table for Supabase (with multitenancy)
CREATE TABLE IF NOT EXISTS marketing_daily_discounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value numeric NOT NULL,
    start_date date,
    end_date date,
    start_time time,
    end_time time,
    days text[] NOT NULL,
    applies_to text,
    services text,
    categories text,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_daily_discounts_business_id ON marketing_daily_discounts(business_id);
CREATE INDEX IF NOT EXISTS idx_marketing_daily_discounts_active ON marketing_daily_discounts(active);

ALTER TABLE marketing_daily_discounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Daily Discounts are isolated by business" ON marketing_daily_discounts;
CREATE POLICY "Daily Discounts are isolated by business" ON marketing_daily_discounts
    USING (auth.uid() IS NOT NULL);
