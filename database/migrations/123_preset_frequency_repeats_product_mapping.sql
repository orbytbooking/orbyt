-- Canonical "Frequency repeats every" for default template frequency names (Form 1 + Form 2 seeds).
-- Idempotent: safe to re-run.

UPDATE public.industry_frequency f
SET
  frequency_repeats = v.new_val,
  updated_at = now()
FROM (
  VALUES
    ('2x per week', 'every-mon-fri'::text),
    ('3x per week', 'every-mon-wed-fri'::text),
    ('Daily 5x per week', 'daily-no-sat-sun'::text),
    ('Weekly', 'every-week'::text),
    ('Every Other Week', 'every-2-weeks'::text),
    ('Monthly', 'every-4-weeks'::text)
) AS v(freq_name, new_val)
WHERE f.name = v.freq_name
  AND f.occurrence_time = 'recurring'
  AND (f.frequency_repeats IS DISTINCT FROM v.new_val);
