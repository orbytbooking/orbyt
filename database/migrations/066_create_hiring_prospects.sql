create table if not exists public.hiring_prospects (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  first_name text not null,
  last_name text,
  name text not null,
  email text not null,
  phone text,
  role text not null default 'Prospect',
  source text not null default 'Manual',
  stage text not null default 'new',
  note text,
  image text,
  step_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hiring_prospects_stage_check check (stage in ('new', 'screening', 'interview', 'hired', 'rejected'))
);

create index if not exists idx_hiring_prospects_business_id on public.hiring_prospects(business_id);
create index if not exists idx_hiring_prospects_stage on public.hiring_prospects(stage);
create index if not exists idx_hiring_prospects_created_at on public.hiring_prospects(created_at desc);
