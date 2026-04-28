-- Log when a quiz invite email is sent (so admin Quizzes tab can list pending invites).

create table if not exists public.hiring_quiz_email_sends (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  form_id uuid not null references public.hiring_forms(id) on delete cascade,
  prospect_id uuid not null references public.hiring_prospects(id) on delete cascade,
  sent_at timestamptz not null default now()
);

create index if not exists idx_hiring_quiz_email_sends_form_id on public.hiring_quiz_email_sends(form_id);
create index if not exists idx_hiring_quiz_email_sends_business_form on public.hiring_quiz_email_sends(business_id, form_id);
create index if not exists idx_hiring_quiz_email_sends_prospect on public.hiring_quiz_email_sends(prospect_id);

comment on table public.hiring_quiz_email_sends is 'Append-only log of quiz invite emails; used with submissions to show sent-but-not-completed rows.';
