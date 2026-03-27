export type FeatureValue = boolean | string;

export type PricingFeatureRow = {
  name: string;
  category: string;
  starter: FeatureValue;
  growth: FeatureValue;
  premium: FeatureValue;
};

// Source of truth for the marketing pricing table and the Super Admin plan feature editor.
export const PRICING_FEATURES: PricingFeatureRow[] = [
  { name: "Providers / Managers", category: "Team", starter: true, growth: true, premium: true },
  { name: "Provider accounts", category: "Team", starter: "3", growth: "10", premium: "Unlimited" },
  { name: "Campaigns", category: "Marketing", starter: "1 campaign", growth: "5 campaigns", premium: "Unlimited" },
  { name: "Hiring workspace", category: "Team", starter: false, growth: true, premium: true },
  { name: "Website builder", category: "Branding", starter: "Basic", growth: "Advanced", premium: "Advanced + custom" },
  { name: "Custom domain", category: "Branding", starter: false, growth: true, premium: true },
  { name: "SSL protection", category: "Security", starter: true, growth: true, premium: true },
  { name: "Booking forms & customization", category: "Booking", starter: "1 form", growth: "Custom forms", premium: "Unlimited" },
  { name: "Import tool", category: "Data", starter: false, growth: true, premium: true },
  { name: "Export bookings", category: "Data", starter: true, growth: true, premium: true },
  { name: "Mobile access", category: "Access", starter: true, growth: true, premium: true },
  { name: "Customer dashboard", category: "Dashboards", starter: true, growth: true, premium: true },
  { name: "Provider / Team dashboard", category: "Dashboards", starter: true, growth: true, premium: true },
  { name: "Admin / Business dashboard", category: "Dashboards", starter: true, growth: true, premium: true },
  { name: "Smart scheduling", category: "Booking", starter: true, growth: true, premium: true },
  { name: "Calendar", category: "Booking", starter: true, growth: true, premium: true },
  { name: "Unassigned bookings & drafts", category: "Booking", starter: true, growth: true, premium: true },
  { name: "Online payments", category: "Payments", starter: true, growth: true, premium: true },
  { name: "Invoicing", category: "Payments", starter: false, growth: true, premium: true },
  { name: "Cancellation fees", category: "Booking", starter: false, growth: true, premium: true },
  { name: "Third party integrations", category: "Integrations", starter: false, growth: "Limited", premium: "Full API" },
  { name: "API integrations", category: "Integrations", starter: false, growth: true, premium: true },
  { name: "Cart abandonment & email lists", category: "Marketing", starter: "Basic via third party", growth: "Basic via third party", premium: "Leads module + advanced" },
  { name: "Remove Orbyt branding", category: "Branding", starter: false, growth: true, premium: true },
  { name: "Schedule automatically", category: "Booking", starter: true, growth: true, premium: true },
  { name: "Email / analytics tracking", category: "Reports", starter: false, growth: true, premium: true },
  { name: "Team alerts", category: "Notifications", starter: false, growth: true, premium: true },
  { name: "Team & clock in/out", category: "Team", starter: false, growth: true, premium: true },
  { name: "Referral & rating system", category: "Marketing", starter: false, growth: true, premium: true },
  { name: "Automatic reviews", category: "Marketing", starter: false, growth: true, premium: true },
  { name: "Team logs & history", category: "Reports", starter: false, growth: true, premium: true },
  { name: "Location & time zones", category: "Settings", starter: true, growth: true, premium: true },
  { name: "Translation", category: "Settings", starter: "1 language", growth: "1 language", premium: "Multilingual" },
  { name: "Coupons", category: "Marketing", starter: true, growth: true, premium: true },
  { name: "Daily discounts", category: "Marketing", starter: false, growth: true, premium: true },
  { name: "Email notifications", category: "Notifications", starter: true, growth: true, premium: true },
  { name: "SMS notifications", category: "Notifications", starter: false, growth: true, premium: true },
  { name: "AI Virtual Receptionist", category: "AI", starter: false, growth: true, premium: true },
  { name: "AI automations", category: "AI", starter: false, growth: true, premium: true },
  { name: "Advanced reports", category: "Reports", starter: false, growth: "Basic", premium: "Full" },
  { name: "Support", category: "Support", starter: "Email", growth: "Email + chat", premium: "Priority" },
];

