-- Per-business hiring "General" settings (admin Hiring → Settings → General).
create table if not exists public.business_hiring_general_settings (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  reject_if_previously_rejected boolean not null default true,
  auto_reject_stale_days integer not null default 90
    check (auto_reject_stale_days >= 1 and auto_reject_stale_days <= 3650),
  auto_reject_by_quiz_score boolean not null default true,
  quiz_minimum_score_percent integer not null default 50
    check (quiz_minimum_score_percent >= 0 and quiz_minimum_score_percent <= 100),
  auto_onboard_when_create_member boolean not null default true,
  prospect_new_badge_days integer not null default 7
    check (prospect_new_badge_days >= 1 and prospect_new_badge_days <= 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.business_hiring_general_settings is
  'Hiring pipeline defaults: duplicate rejection, stale auto-reject, quiz score rules, onboarding shortcut, new-badge window.';
