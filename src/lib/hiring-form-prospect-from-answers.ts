import type { HiringFormValidationField } from '@/lib/hiring-form-validation';

function str(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

function collectNameFromNameFields(
  formFields: HiringFormValidationField[],
  answers: Record<string, unknown>
): { firstName: string; lastName: string } {
  let firstName = '';
  let lastName = '';
  for (const f of formFields) {
    if (f.hidden) continue;
    if (f.type !== 'name') continue;
    const fi = str(answers[`${f.id}_first`]);
    const la = str(answers[`${f.id}_last`]);
    if (!firstName && fi) firstName = fi;
    if (!lastName && la) lastName = la;
  }
  return { firstName, lastName };
}

/**
 * Display label from hiring form answers using `name` fields only (no email required).
 * Used when there is no linked prospect and answers were saved without an email field.
 */
export function displayNameFromHiringAnswers(
  formFields: unknown[],
  answers: Record<string, unknown>
): string | null {
  const fields = Array.isArray(formFields) ? (formFields as HiringFormValidationField[]) : [];
  const { firstName, lastName } = collectNameFromNameFields(fields, answers);
  const joined = [firstName, lastName].filter(Boolean).join(' ').trim();
  if (joined) return joined;
  if (firstName) return firstName;
  if (lastName) return lastName;
  return null;
}

/**
 * Best-effort map of hiring form answers → hiring_prospects insert fields.
 */
export function extractProspectFromAnswers(
  formFields: unknown[],
  answers: Record<string, unknown>
): { firstName: string; lastName: string; email: string; phone: string | null } | null {
  const fields = Array.isArray(formFields) ? (formFields as HiringFormValidationField[]) : [];
  const { firstName, lastName } = collectNameFromNameFields(fields, answers);
  let email = '';
  let phone: string | null = null;

  for (const f of fields) {
    if (f.hidden) continue;
    if (f.type === 'email' && !email) {
      email = str(answers[f.id]);
    } else if (f.type === 'phone' && phone == null) {
      const p = str(answers[f.id]);
      if (p) phone = p;
    }
  }

  if (!email) return null;
  let fn = firstName;
  let ln = lastName;
  if (!fn && !ln) {
    const local = email.split('@')[0] ?? 'Applicant';
    fn = local.slice(0, 80) || 'Applicant';
  }
  return { firstName: fn || 'Applicant', lastName: ln, email, phone };
}
