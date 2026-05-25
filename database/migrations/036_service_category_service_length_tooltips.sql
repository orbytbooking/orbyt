-- Add service length tooltip fields to industry_service_category
ALTER TABLE public.industry_service_category
  ADD COLUMN IF NOT EXISTS enable_service_length_tooltip_customer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_length_tooltip_text_customer text,
  ADD COLUMN IF NOT EXISTS enable_service_length_tooltip_provider boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_length_tooltip_text_provider text;

COMMENT ON COLUMN public.industry_service_category.enable_service_length_tooltip_customer IS 'When true, show a tooltip for service length on customer end';
COMMENT ON COLUMN public.industry_service_category.service_length_tooltip_text_customer IS 'Tooltip text for service length on customer end';
COMMENT ON COLUMN public.industry_service_category.enable_service_length_tooltip_provider IS 'When true, show a tooltip for service length on provider end';
COMMENT ON COLUMN public.industry_service_category.service_length_tooltip_text_provider IS 'Tooltip text for service length on provider end';
