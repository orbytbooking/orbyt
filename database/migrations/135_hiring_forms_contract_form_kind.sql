-- Contract forms: same builder/publish flow as prospect forms; not quiz-graded.

alter table public.hiring_forms
  drop constraint if exists hiring_forms_form_kind_check;

alter table public.hiring_forms
  add constraint hiring_forms_form_kind_check check (form_kind in ('prospect', 'quiz', 'contract'));

comment on column public.hiring_forms.form_kind is 'prospect = hiring apply forms; quiz = scored quizzes; contract = agreements / contract collection';
