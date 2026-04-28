-- Optional client-defined funnel id (matches localStorage funnel ids from onboarding UI).
alter table public.hiring_prospects
  add column if not exists funnel_id text null;

create index if not exists idx_hiring_prospects_business_funnel
  on public.hiring_prospects (business_id, funnel_id);
