-- Add explanation icon and popup-on-selection fields to industry_service_category
ALTER TABLE public.industry_service_category
  ADD COLUMN IF NOT EXISTS show_explanation_icon_on_form boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS explanation_tooltip_text text,
  ADD COLUMN IF NOT EXISTS enable_popup_on_selection boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popup_content text;

COMMENT ON COLUMN public.industry_service_category.show_explanation_icon_on_form IS 'When true, show an explanation icon on the form';
COMMENT ON COLUMN public.industry_service_category.explanation_tooltip_text IS 'Tooltip text for the explanation icon';
COMMENT ON COLUMN public.industry_service_category.enable_popup_on_selection IS 'When true, show a popup when this service category is selected';
COMMENT ON COLUMN public.industry_service_category.popup_content IS 'Rich text (HTML) content for the selection popup';
