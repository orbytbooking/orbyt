-- Distinguish prospect (apply) forms vs quiz forms. Grading applies only to quiz forms (enforced in API).

alter table public.hiring_forms
  add column if not exists form_kind text not null default 'prospect';

alter table public.hiring_forms
  drop constraint if exists hiring_forms_form_kind_check;

alter table public.hiring_forms
  add constraint hiring_forms_form_kind_check check (form_kind in ('prospect', 'quiz'));

comment on column public.hiring_forms.form_kind is 'prospect = hiring apply forms; quiz = scored quizzes';
