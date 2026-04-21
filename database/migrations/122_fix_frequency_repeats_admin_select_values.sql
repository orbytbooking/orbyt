-- Align stored frequency_repeats with admin "Frequency repeats every" Select values
-- (legacy seeds used twice-weekly / weekly / bi-weekly which are not valid SelectItem values).

UPDATE public.industry_frequency f
SET
  frequency_repeats = v.new_val,
  updated_at = now()
FROM (
  VALUES
    ('2x per week', 'every-mon-fri'::text),
    ('3x per week', 'every-mon-wed-fri'::text),
    ('Weekly', 'every-week'::text),
    ('Every Other Week', 'every-2-weeks'::text)
) AS v(freq_name, new_val)
WHERE f.name = v.freq_name
  AND f.occurrence_time = 'recurring'
  AND f.frequency_repeats IS NOT NULL
  AND f.frequency_repeats IN ('twice-weekly', 'three-weekly', 'weekly', 'bi-weekly');
