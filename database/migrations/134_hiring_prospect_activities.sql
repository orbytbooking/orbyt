-- Append-only activity log for hiring prospects (profile changes, lifecycle events, etc.).

create table if not exists public.hiring_prospect_activities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  prospect_id uuid not null references public.hiring_prospects(id) on delete cascade,
  kind text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_hiring_prospect_activities_prospect_created
  on public.hiring_prospect_activities (prospect_id, created_at desc);

create index if not exists idx_hiring_prospect_activities_business_id
  on public.hiring_prospect_activities (business_id);

comment on table public.hiring_prospect_activities is 'Audit-style events for a hiring prospect (shown in admin prospect details).';
