-- Tooltip copy for frequency info icon + rich popup HTML on selection (admin Form 1 → Frequencies)
ALTER TABLE public.industry_frequency
  ADD COLUMN IF NOT EXISTS explanation_tooltip_text text,
  ADD COLUMN IF NOT EXISTS popup_content text;

COMMENT ON COLUMN public.industry_frequency.explanation_tooltip_text IS 'Shown next to frequency on booking when show_explanation is true';
COMMENT ON COLUMN public.industry_frequency.popup_content IS 'HTML body for dialog when enable_popup is true and frequency is selected';
