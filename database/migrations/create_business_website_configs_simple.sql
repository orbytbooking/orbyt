-- Simple version of business_website_configs table (without RLS for easier setup)
CREATE TABLE IF NOT EXISTS business_website_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_website_configs_business_id ON business_website_configs(business_id);

-- Insert default config for existing businesses
INSERT INTO business_website_configs (business_id, config)
SELECT id, '{
  "sections": [
    {
      "id": "hero",
      "type": "hero",
      "visible": true,
      "data": {
        "title": "Thanks For Stopping By",
        "subtitle": "Let Us Connect You With Top Providers",
        "description": "Experience hassle-free booking with instant confirmation, vetted professionals, and premium service quality.",
        "backgroundImage": "/images/hero-background-chicago.png",
        "button1Text": "Book Service",
        "button1Link": "/book-now",
        "button2Text": "Contact Us",
        "button2Link": "#contact"
      }
    },
    {
      "id": "services",
      "type": "services", 
      "visible": true,
      "data": {
        "title": "Our Services",
        "subtitle": "Professional cleaning services tailored to your needs",
        "services": []
      }
    },
    {
      "id": "how-it-works",
      "type": "how-it-works",
      "visible": true,
      "data": {
        "title": "How It Works?",
        "steps": []
      }
    },
    {
      "id": "reviews",
      "type": "reviews",
      "visible": true,
      "data": {
        "title": "What Our Customers Say",
        "reviews": []
      }
    },
    {
      "id": "faqs",
      "type": "faqs",
      "visible": true,
      "data": {
        "title": "Frequently Asked Questions",
        "subtitle": "Find answers to common questions about our services and booking process."
      }
    },
    {
      "id": "contact",
      "type": "contact",
      "visible": true,
      "data": {
        "title": "Contact Us",
        "email": "info@orbyt.com",
        "phone": "+1 234 567 8900",
        "address": "123 Main St, Chicago, IL 60601"
      }
    }
  ],
  "branding": {
    "companyName": "ORBYT",
    "logo": "",
    "primaryColor": "#00BCD4",
    "secondaryColor": "#00D4E8"
  },
  "theme": {
    "mode": "dark"
  },
  "features": {
    "onlineBooking": true,
    "giftCards": true,
    "notifications": true
  }
}'::jsonb
FROM businesses
WHERE id NOT IN (SELECT business_id FROM business_website_configs);
