-- Hiring form definitions (builder) and applicant submissions (public apply link).

create table if not exists public.hiring_forms (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  definition jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  published_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hiring_forms_business_id on public.hiring_forms(business_id);
create index if not exists idx_hiring_forms_published_slug on public.hiring_forms(published_slug)
  where published_slug is not null;

create table if not exists public.hiring_form_submissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  form_id uuid not null references public.hiring_forms(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  prospect_id uuid references public.hiring_prospects(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_hiring_form_submissions_form_id on public.hiring_form_submissions(form_id);
create index if not exists idx_hiring_form_submissions_business_id on public.hiring_form_submissions(business_id);
create index if not exists idx_hiring_form_submissions_created_at on public.hiring_form_submissions(created_at desc);
