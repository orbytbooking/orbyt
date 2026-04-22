/**
 * Shared hiring form validation (builder canvas + public apply).
 * Mirrors logic in admin form builder submit handler.
 */

type NameSub = { required?: boolean; error?: string };
type NameCfg = {
  subFields?: Partial<Record<'first' | 'last' | 'middle', NameSub>>;
};

export type HiringFormValidationField = {
  id: string;
  type: string;
  hidden?: boolean;
  nameConfig?: NameCfg;
  emailConfig?: { required?: boolean; error?: string };
  fieldConfig?: { required?: boolean; error?: string };
  dropdownConfig?: { required?: boolean; error?: string };
  radioConfig?: { required?: boolean; error?: string };
  multipleConfig?: { required?: boolean; error?: string };
  multilineConfig?: { required?: boolean; error?: string };
};

const DEFAULT_FIRST: NameSub = {
  error: 'This field should not be empty',
  required: true,
};
const DEFAULT_LAST: NameSub = {
  error: 'This field should not be empty',
  required: true,
};

const DEFAULT_NAME_CFG = {
  horizontal: true,
  columns: 2,
  middleName: false,
};

function isFieldRequired(field: HiringFormValidationField): boolean {
  if (field.type === 'email') return field.emailConfig?.required ?? true;
  if (field.type === 'name') {
    const cfg = { ...DEFAULT_NAME_CFG, ...field.nameConfig };
    const sub = cfg.subFields ?? {};
    const first = { ...DEFAULT_FIRST, ...sub.first };
    const last = { ...DEFAULT_LAST, ...sub.last };
    return first.required === true || last.required === true;
  }
  if (
    field.type === 'header' ||
    field.type === 'label' ||
    field.type === 'paragraph' ||
    field.type === 'divider'
  ) {
    return false;
  }
  return !!(
    field.fieldConfig?.required ??
    field.dropdownConfig?.required ??
    field.radioConfig?.required ??
    field.multipleConfig?.required ??
    field.multilineConfig?.required
  );
}

function getFieldErrorMessage(field: HiringFormValidationField): string {
  if (field.type === 'email') return field.emailConfig?.error ?? 'This field should not be empty';
  if (field.type === 'name') return DEFAULT_FIRST.error ?? 'This field should not be empty';
  return (
    field.fieldConfig?.error ??
    field.dropdownConfig?.error ??
    field.radioConfig?.error ??
    field.multipleConfig?.error ??
    field.multilineConfig?.error ??
    'This field should not be empty'
  );
}

function asFields(raw: unknown): HiringFormValidationField[] {
  if (!Array.isArray(raw)) return [];
  return raw as HiringFormValidationField[];
}

/** Returns field id → error message for invalid required fields. */
export function validateHiringFormFields(formFields: unknown[], data: FormData): Record<string, string> {
  const fields = asFields(formFields);
  const errors: Record<string, string> = {};
  fields.forEach((field) => {
    if (field.hidden || !isFieldRequired(field)) return;
    if (field.type === 'name') {
      const cfg = { ...DEFAULT_NAME_CFG, ...field.nameConfig };
      const sub = cfg.subFields ?? {};
      const first = { ...DEFAULT_FIRST, ...sub.first };
      const last = { ...DEFAULT_LAST, ...sub.last };
      const firstVal = (data.get(`${field.id}_first`) as string)?.trim() ?? '';
      const lastVal = (data.get(`${field.id}_last`) as string)?.trim() ?? '';
      if (first.required && !firstVal) errors[field.id] = first.error ?? 'This field should not be empty';
      else if (last.required && !lastVal) errors[field.id] = last.error ?? 'This field should not be empty';
      return;
    }
    if (field.type === 'multiple') {
      const values = data.getAll(field.id) as string[];
      if (values.length === 0) errors[field.id] = getFieldErrorMessage(field);
      return;
    }
    if (field.type === 'rating') {
      const val = String(data.get(field.id) ?? '').trim();
      if (val === '' || val === '0') errors[field.id] = getFieldErrorMessage(field);
      return;
    }
    const value = data.get(field.id);
    const isFile = value instanceof File;
    const isEmpty =
      value == null || (isFile ? value.size === 0 : String(value ?? '').trim() === '');
    if (isEmpty) errors[field.id] = getFieldErrorMessage(field);
  });
  return errors;
}

/** Flatten FormData to JSON-friendly answers (files → metadata only). */
export function formDataToHiringAnswers(data: FormData): Record<string, unknown> {
  const answers: Record<string, unknown> = {};
  const keys = new Set<string>();
  for (const k of data.keys()) {
    keys.add(k);
  }
  keys.forEach((key) => {
    const all = data.getAll(key);
    if (all.length === 0) return;
    if (all.length === 1) {
      const v = all[0];
      if (v instanceof File) {
        answers[key] =
          v.size > 0
            ? { _type: 'file', name: v.name, size: v.size, mime: v.type || null }
            : '';
      } else {
        answers[key] = v;
      }
      return;
    }
    answers[key] = all.map((v) =>
      v instanceof File
        ? v.size > 0
          ? { _type: 'file', name: v.name, size: v.size, mime: v.type || null }
          : ''
        : v
    );
  });
  return answers;
}
