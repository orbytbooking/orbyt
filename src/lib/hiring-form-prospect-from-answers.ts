import type { HiringFormValidationField } from '@/lib/hiring-form-validation';

function str(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

/**
 * Best-effort map of hiring form answers → hiring_prospects insert fields.
 */
export function extractProspectFromAnswers(
  formFields: unknown[],
  answers: Record<string, unknown>
): { firstName: string; lastName: string; email: string; phone: string | null } | null {
  const fields = Array.isArray(formFields) ? (formFields as HiringFormValidationField[]) : [];
  let firstName = '';
  let lastName = '';
  let email = '';
  let phone: string | null = null;

  for (const f of fields) {
    if (f.hidden) continue;
    if (f.type === 'name') {
      const fi = str(answers[`${f.id}_first`]);
      const la = str(answers[`${f.id}_last`]);
      if (!firstName && fi) firstName = fi;
      if (!lastName && la) lastName = la;
    } else if (f.type === 'email' && !email) {
      email = str(answers[f.id]);
    } else if (f.type === 'phone' && phone == null) {
      const p = str(answers[f.id]);
      if (p) phone = p;
    }
  }

  if (!email) return null;
  if (!firstName && !lastName) {
    const local = email.split('@')[0] ?? 'Applicant';
    firstName = local.slice(0, 80) || 'Applicant';
  }
  return { firstName: firstName || 'Applicant', lastName, email, phone };
}
