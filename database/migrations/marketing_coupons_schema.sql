-- Marketing Coupons Table for Supabase (with multitenancy)
CREATE TABLE IF NOT EXISTS marketing_coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text,
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    code text NOT NULL,
    description text,
    discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value numeric NOT NULL,
    start_date date,
    end_date date,
    usage_limit integer,
    min_order numeric,
    active boolean DEFAULT true,
    facebook_coupon boolean DEFAULT false,
    allow_gift_cards boolean DEFAULT false,
    allow_referrals boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_coupons_business_id ON marketing_coupons(business_id);
CREATE INDEX IF NOT EXISTS idx_marketing_coupons_code ON marketing_coupons(code);

-- Row Level Security for multitenancy
ALTER TABLE marketing_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coupons are isolated by business" ON marketing_coupons
    USING (auth.uid() IS NOT NULL);
