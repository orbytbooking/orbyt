-- Minimum booked duration (customer book-now) with optional custom message
ALTER TABLE public.industry_service_category
  ADD COLUMN IF NOT EXISTS minimum_time jsonb NOT NULL DEFAULT '{"enabled": false, "hours": "0", "minutes": "0", "textToDisplay": false, "noticeText": ""}'::jsonb;

COMMENT ON COLUMN public.industry_service_category.minimum_time IS 'When enabled, book-now blocks checkout if estimated duration is below hours+minutes; optional noticeText when textToDisplay is true';
