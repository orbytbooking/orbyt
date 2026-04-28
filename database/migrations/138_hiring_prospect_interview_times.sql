-- When a prospect is in the interview stage, optional scheduled window (local instant stored as timestamptz).
alter table public.hiring_prospects
  add column if not exists interview_starts_at timestamptz,
  add column if not exists interview_ends_at timestamptz;

create index if not exists idx_hiring_prospects_interview_starts_at
  on public.hiring_prospects (business_id, interview_starts_at)
  where interview_starts_at is not null;
