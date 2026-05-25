-- Pricing page feature control (Super Admin editable)
-- Stored as per-plan `pricing_features` JSONB: { "<feature name>": true | false | "some string" }

ALTER TABLE public.platform_subscription_plans
  ADD COLUMN IF NOT EXISTS pricing_features jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Seed defaults to match `src/app/pricing/page.tsx` feature table.
UPDATE public.platform_subscription_plans
SET pricing_features = $FEATURES_STARTER$
{
  "Providers / Managers": true,
  "Provider accounts": "3",
  "Campaigns": "1 campaign",
  "Hiring workspace": false,
  "Website builder": "Basic",
  "Custom domain": false,
  "SSL protection": true,
  "Booking forms & customization": "1 form",
  "Import tool": false,
  "Export bookings": true,
  "Mobile access": true,
  "Customer dashboard": true,
  "Provider / Team dashboard": true,
  "Admin / Business dashboard": true,
  "Smart scheduling": true,
  "Calendar": true,
  "Unassigned bookings & drafts": true,
  "Online payments": true,
  "Invoicing": false,
  "Cancellation fees": false,
  "Third party integrations": false,
  "Cart abandonment & email lists": "Basic via third party",
  "Remove Orbyt branding": false,
  "Schedule automatically": true,
  "Email / analytics tracking": false,
  "Team alerts": false,
  "Team & clock in/out": false,
  "Referral & rating system": false,
  "Automatic reviews": false,
  "Team logs & history": false,
  "Location & time zones": true,
  "Translation": "1 language",
  "Coupons": true,
  "Daily discounts": false,
  "Email notifications": true,
  "SMS notifications": false,
  "AI Virtual Receptionist": false,
  "Advanced reports": false,
  "Support": "Email"
}
$FEATURES_STARTER$::jsonb
WHERE slug = 'starter';

UPDATE public.platform_subscription_plans
SET pricing_features = $FEATURES_GROWTH$
{
  "Providers / Managers": true,
  "Provider accounts": "10",
  "Campaigns": "5 campaigns",
  "Hiring workspace": true,
  "Website builder": "Advanced",
  "Custom domain": true,
  "SSL protection": true,
  "Booking forms & customization": "Custom forms",
  "Import tool": true,
  "Export bookings": true,
  "Mobile access": true,
  "Customer dashboard": true,
  "Provider / Team dashboard": true,
  "Admin / Business dashboard": true,
  "Smart scheduling": true,
  "Calendar": true,
  "Unassigned bookings & drafts": true,
  "Online payments": true,
  "Invoicing": true,
  "Cancellation fees": true,
  "Third party integrations": "Limited",
  "Cart abandonment & email lists": "Basic via third party",
  "Remove Orbyt branding": true,
  "Schedule automatically": true,
  "Email / analytics tracking": true,
  "Team alerts": true,
  "Team & clock in/out": true,
  "Referral & rating system": true,
  "Automatic reviews": true,
  "Team logs & history": true,
  "Location & time zones": true,
  "Translation": "1 language",
  "Coupons": true,
  "Daily discounts": true,
  "Email notifications": true,
  "SMS notifications": true,
  "AI Virtual Receptionist": true,
  "Advanced reports": "Basic",
  "Support": "Email + chat"
}
$FEATURES_GROWTH$::jsonb
WHERE slug = 'growth';

UPDATE public.platform_subscription_plans
SET pricing_features = $FEATURES_PREMIUM$
{
  "Providers / Managers": true,
  "Provider accounts": "Unlimited",
  "Campaigns": "Unlimited",
  "Hiring workspace": true,
  "Website builder": "Advanced + custom",
  "Custom domain": true,
  "SSL protection": true,
  "Booking forms & customization": "Unlimited",
  "Import tool": true,
  "Export bookings": true,
  "Mobile access": true,
  "Customer dashboard": true,
  "Provider / Team dashboard": true,
  "Admin / Business dashboard": true,
  "Smart scheduling": true,
  "Calendar": true,
  "Unassigned bookings & drafts": true,
  "Online payments": true,
  "Invoicing": true,
  "Cancellation fees": true,
  "Third party integrations": "Full API",
  "Cart abandonment & email lists": "Leads module + advanced",
  "Remove Orbyt branding": true,
  "Schedule automatically": true,
  "Email / analytics tracking": true,
  "Team alerts": true,
  "Team & clock in/out": true,
  "Referral & rating system": true,
  "Automatic reviews": true,
  "Team logs & history": true,
  "Location & time zones": true,
  "Translation": "Multilingual",
  "Coupons": true,
  "Daily discounts": true,
  "Email notifications": true,
  "SMS notifications": true,
  "AI Virtual Receptionist": true,
  "Advanced reports": "Full",
  "Support": "Priority"
}
$FEATURES_PREMIUM$::jsonb
WHERE slug = 'premium';

