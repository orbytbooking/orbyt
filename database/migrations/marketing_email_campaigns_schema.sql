-- Marketing Email Campaigns Table for Supabase (with multitenancy)
CREATE TABLE IF NOT EXISTS marketing_email_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    subject text NOT NULL,
    body text NOT NULL,
    template text NOT NULL CHECK (template IN ('holiday', 'coupon', 'advertisement', 'custom')),
    recipients text[] NOT NULL,
    sent_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_email_campaigns_business_id ON marketing_email_campaigns(business_id);
CREATE INDEX IF NOT EXISTS idx_marketing_email_campaigns_template ON marketing_email_campaigns(template);

ALTER TABLE marketing_email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Email campaigns are isolated by business" ON marketing_email_campaigns
    USING (auth.uid() IS NOT NULL AND business_id = current_setting('request.jwt.claims', true)::json->>'business_id');
