-- Marketing Scripts Table for Supabase (with multitenancy)
CREATE TABLE IF NOT EXISTS marketing_scripts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title text NOT NULL,
    category text NOT NULL CHECK (category IN ('Cold Calling', 'Follow-up', 'SMS')),
    content text NOT NULL,
    updated_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_scripts_business_id ON marketing_scripts(business_id);
CREATE INDEX IF NOT EXISTS idx_marketing_scripts_category ON marketing_scripts(category);

ALTER TABLE marketing_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scripts are isolated by business" ON marketing_scripts
    USING (auth.uid() IS NOT NULL AND business_id = current_setting('request.jwt.claims', true)::json->>'business_id');
