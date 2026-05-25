-- Remove legacy "Default — " style prefix from Form 2 starter package names (see 127 seed naming).
UPDATE public.industry_pricing_parameter
SET name = regexp_replace(name, '^Default[[:space:]]+[—–-][[:space:]]+', '')
WHERE booking_form_scope = 'form2'
  AND name ~ '^Default[[:space:]]+[—–-][[:space:]]+';
