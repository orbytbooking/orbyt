-- Competitive Subscription Plans Schema
-- Better pricing than BookingKoala with superior features

-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, yearly
    description TEXT,
    features JSONB NOT NULL DEFAULT '[]',
    limits JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create business subscriptions table
CREATE TABLE IF NOT EXISTS business_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, cancelled, expired, trialing
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id)
);

-- Create subscription usage tracking table
CREATE TABLE IF NOT EXISTS subscription_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    feature VARCHAR(100) NOT NULL,
    usage_count INTEGER DEFAULT 0,
    limit_count INTEGER,
    period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, feature, period_start, period_end)
);

-- Insert competitive subscription plans
INSERT INTO subscription_plans (name, slug, price, description, features, limits, sort_order) VALUES
(
    'Starter',
    'starter',
    19.00,
    'Perfect for small businesses getting started with online bookings',
    '[
        "Unlimited bookings",
        "Unlimited services", 
        "Unlimited staff",
        "Unlimited customers",
        "Unlimited forms",
        "Unlimited coupons",
        "Unlimited gift cards",
        "Unlimited notifications",
        "Unlimited reports",
        "Unlimited support",
        "Online payments",
        "Custom domain",
        "Custom branding",
        "Mobile app access",
        "Email notifications",
        "SMS notifications",
        "Calendar sync",
        "Recurring bookings",
        "Waitlist management",
        "Customer reviews",
        "Advanced analytics"
    ]'::jsonb,
    '{
        "staff": 5,
        "services": 20,
        "bookings_per_month": 500,
        "storage_mb": 1000,
        "custom_domains": 1,
        "api_calls_per_month": 10000
    }'::jsonb,
    1
),
(
    'Growth',
    'growth', 
    49.00,
    'Ideal for growing businesses needing advanced features and automation',
    '[
        "Everything in Starter",
        "Custom CSS & JavaScript",
        "Advanced booking forms",
        "Custom booking pages",
        "Booking widgets",
        "White label options",
        "API access",
        "Webhook integrations",
        "Zapier integration",
        "Multi-location support",
        "Advanced reporting",
        "Priority support",
        "Custom workflows",
        "Automated reminders",
        "Bulk operations",
        "Team collaboration",
        "Client portal",
        "Resource scheduling",
        "Service areas",
        "Travel fees calculation",
        "Commission tracking",
        "Inventory management",
        "Loyalty programs",
        "Referral system",
        "Advanced analytics dashboard"
    ]'::jsonb,
    '{
        "staff": 20,
        "services": 100,
        "bookings_per_month": 2000,
        "storage_mb": 5000,
        "custom_domains": 5,
        "api_calls_per_month": 50000,
        "webhooks": 10
    }'::jsonb,
    2
),
(
    'Pro',
    'pro',
    110.00,
    'Complete solution for established businesses with enterprise needs',
    '[
        "Everything in Growth",
        "Dedicated account manager",
        "Priority phone support",
        "Custom development hours",
        "Advanced integrations",
        "Custom reports & dashboards",
        "Advanced analytics & AI insights",
        "Custom training sessions",
        "Data migration services",
        "Advanced security features",
        "Compliance tools",
        "White label mobile app",
        "Custom API development",
        "Advanced workflow automation",
        "Multi-currency support",
        "Advanced inventory management",
        "Staff performance tracking",
        "Customer segmentation",
        "Marketing automation",
        "Advanced booking rules",
        "Resource optimization",
        "Revenue forecasting",
        "Custom branding removal",
        "SLA guarantee",
        "Disaster recovery",
        "Advanced user permissions",
        "Audit logs",
        "Custom integrations marketplace"
    ]'::jsonb,
    '{
        "staff": "unlimited",
        "services": "unlimited", 
        "bookings_per_month": "unlimited",
        "storage_mb": "unlimited",
        "custom_domains": "unlimited",
        "api_calls_per_month": "unlimited",
        "webhooks": "unlimited",
        "custom_development_hours": 10
    }'::jsonb,
    3
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_business_id ON business_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_plan_id ON business_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_status ON business_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_business_id ON subscription_usage(business_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_feature ON subscription_usage(feature);

-- Enable Row Level Security
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read for active plans)
CREATE POLICY "Anyone can view active subscription plans" ON subscription_plans
    FOR SELECT USING (is_active = true);

-- RLS Policies for business_subscriptions
CREATE POLICY "Businesses can view own subscription" ON business_subscriptions
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM users WHERE business_id = business_subscriptions.business_id
    ));

CREATE POLICY "Businesses can update own subscription" ON business_subscriptions
    FOR UPDATE USING (auth.uid() IN (
        SELECT id FROM users WHERE business_id = business_subscriptions.business_id
    ));

-- RLS Policies for subscription_usage
CREATE POLICY "Businesses can view own usage" ON subscription_usage
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM users WHERE business_id = subscription_usage.business_id
    ));

CREATE POLICY "Businesses can update own usage" ON subscription_usage
    FOR UPDATE USING (auth.uid() IN (
        SELECT id FROM users WHERE business_id = subscription_usage.business_id
    ));

-- Function to get current business subscription
CREATE OR REPLACE FUNCTION get_current_business_subscription(business_uuid UUID)
RETURNS TABLE (
    plan_id UUID,
    plan_name VARCHAR,
    plan_slug VARCHAR,
    price DECIMAL,
    status VARCHAR,
    features JSONB,
    limits JSONB,
    current_period_end TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id,
        sp.name,
        sp.slug,
        sp.price,
        bs.status,
        sp.features,
        sp.limits,
        bs.current_period_end
    FROM business_subscriptions bs
    JOIN subscription_plans sp ON bs.plan_id = sp.id
    WHERE bs.business_id = business_uuid 
    AND bs.status = 'active'
    AND (bs.current_period_end IS NULL OR bs.current_period_end > NOW())
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if business has access to feature
CREATE OR REPLACE FUNCTION has_feature_access(business_uuid UUID, feature_name VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    feature_available BOOLEAN := false;
    plan_features JSONB;
BEGIN
    SELECT sp.features INTO plan_features
    FROM business_subscriptions bs
    JOIN subscription_plans sp ON bs.plan_id = sp.id
    WHERE bs.business_id = business_uuid 
    AND bs.status = 'active'
    AND (bs.current_period_end IS NULL OR bs.current_period_end > NOW())
    LIMIT 1;
    
    IF plan_features IS NOT NULL THEN
        feature_available := feature_name = ANY(SELECT value FROM jsonb_array_elements_text(plan_features));
    END IF;
    
    RETURN feature_available;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get usage limit for business
CREATE OR REPLACE FUNCTION get_usage_limit(business_uuid UUID, limit_name VARCHAR)
RETURNS JSONB AS $$
DECLARE
    limit_value JSONB;
BEGIN
    SELECT sp.limits INTO limit_value
    FROM business_subscriptions bs
    JOIN subscription_plans sp ON bs.plan_id = sp.id
    WHERE bs.business_id = business_uuid 
    AND bs.status = 'active'
    AND (bs.current_period_end IS NULL OR bs.current_period_end > NOW())
    LIMIT 1;
    
    RETURN COALESCE(limit_value->limit_name, 'null'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_business_subscriptions_updated_at
    BEFORE UPDATE ON business_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_usage_updated_at
    BEFORE UPDATE ON subscription_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE subscription_plans IS 'Competitive subscription plans with better pricing than BookingKoala';
COMMENT ON TABLE business_subscriptions IS 'Business subscription tracking and management';
COMMENT ON TABLE subscription_usage IS 'Usage tracking for subscription limits and billing';
