-- Per-funnel-column status + optional note for each prospect (column ids match onboarding funnel column ids).
alter table public.hiring_prospects
  add column if not exists funnel_step_statuses jsonb not null default '{}'::jsonb;
