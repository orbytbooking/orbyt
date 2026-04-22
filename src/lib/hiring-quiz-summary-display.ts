import { extractProspectFromAnswers } from '@/lib/hiring-form-prospect-from-answers';
import type { HiringFormGradingSummary } from '@/lib/hiring-form-grading';

type FormField = {
  id: string;
  type: string;
  label?: string;
  hidden?: boolean;
  nameConfig?: unknown;
  radioConfig?: {
    graded?: boolean;
    gradedCorrectOptionId?: string;
    options?: { id: string; label: string }[];
  };
  dropdownConfig?: {
    graded?: boolean;
    gradedCorrectOptionId?: string;
    options?: { id: string; label: string }[];
  };
  multipleConfig?: {
    graded?: boolean;
    gradedCorrectOptionIds?: string[];
    options?: { id: string; label: string }[];
  };
};

function fieldTitle(f: FormField): string {
  if (f.label?.trim()) return f.label.trim();
  const t = f.type;
  if (t === 'name') return 'Name';
  if (t === 'email') return 'Email';
  if (t === 'phone') return 'Phone number';
  if (t === 'radio') return 'Radio';
  if (t === 'dropdown') return 'Dropdown';
  if (t === 'multiple') return 'Multiple choice';
  if (t === 'text') return 'Text';
  if (t === 'number') return 'Number';
  if (t === 'multiline') return 'Multi-line';
  return t;
}

function optionLabel(opts: { id: string; label: string }[] | undefined, id: string): string {
  return opts?.find((o) => o.id === id)?.label ?? id;
}

function formatAnswerForField(f: FormField, answers: Record<string, unknown>): string {
  if (f.hidden) return '';
  const t = f.type;
  if (t === 'name') {
    const fi = String(answers[`${f.id}_first`] ?? '').trim();
    const la = String(answers[`${f.id}_last`] ?? '').trim();
    return [fi, la].filter(Boolean).join(' ') || '—';
  }
  if (t === 'multiple') {
    const raw = answers[f.id];
    const ids = Array.isArray(raw)
      ? raw.map((x) => String(x).trim()).filter(Boolean)
      : typeof raw === 'string' && raw
        ? [raw.trim()]
        : [];
    const opts = f.multipleConfig?.options ?? [];
    if (ids.length === 0) return '—';
    return ids.map((id) => optionLabel(opts, id)).join(', ');
  }
  if (t === 'radio' || t === 'dropdown') {
    const opts = t === 'radio' ? f.radioConfig?.options : f.dropdownConfig?.options;
    const id = String(answers[f.id] ?? '').trim();
    if (!id) return '—';
    return optionLabel(opts, id);
  }
  const v = answers[f.id];
  if (v == null) return '—';
  if (typeof v === 'object' && v !== null && '_type' in (v as object)) return String((v as { name?: string }).name ?? '—');
  return String(v).trim() || '—';
}

const SKIP_TYPES = new Set(['header', 'label', 'paragraph', 'divider', 'image', 'signature']);

export type QuizSummaryQuestionRow = {
  fieldId: string;
  label: string;
  fieldType: string;
  answerText: string;
  /** null = not a graded question */
  isCorrect: boolean | null;
};

export function buildQuizSummaryQuestions(
  formFields: unknown[],
  answers: Record<string, unknown>,
  grading: HiringFormGradingSummary | null | undefined
): QuizSummaryQuestionRow[] {
  const fields = (Array.isArray(formFields) ? formFields : []) as FormField[];
  const byGrade = grading?.byFieldId ?? {};
  const rows: QuizSummaryQuestionRow[] = [];

  for (const f of fields) {
    if (SKIP_TYPES.has(f.type)) continue;
    const answerText = formatAnswerForField(f, answers);
    const hasAnswer = answerText !== '' && answerText !== '—';
    const g = byGrade[f.id];
    const isCorrect = g ? g.correct : null;
    if (!hasAnswer && isCorrect == null) continue;
    rows.push({
      fieldId: f.id,
      label: fieldTitle(f),
      fieldType: f.type,
      answerText: answerText || '—',
      isCorrect,
    });
  }
  return rows;
}

export function prospectSnapshotFromAnswers(
  formFields: unknown[],
  answers: Record<string, unknown>
): { firstName: string; lastName: string; email: string; phone: string } {
  const extracted = extractProspectFromAnswers(formFields, answers);
  if (extracted) {
    return {
      firstName: extracted.firstName,
      lastName: extracted.lastName,
      email: extracted.email,
      phone: extracted.phone?.trim() ?? '',
    };
  }
  return { firstName: '', lastName: '', email: '', phone: '' };
}

export type GradedQuizReviewRow = {
  fieldId: string;
  label: string;
  fieldType: string;
  answerText: string;
  correctAnswerText: string;
  /** From stored (merged) grading; null when this question is skipped out of the score. */
  effectiveCorrect: boolean | null;
  skippedFromScore: boolean;
};

/** One row per form field that has grading configured (radio / dropdown / multiple). */
export function buildGradedQuizReviewRows(
  formFields: unknown[],
  answers: Record<string, unknown>,
  grading: HiringFormGradingSummary | null | undefined
): GradedQuizReviewRow[] {
  if (!grading) return [];
  const fields = (Array.isArray(formFields) ? formFields : []) as FormField[];
  const rows: GradedQuizReviewRow[] = [];

  for (const f of fields) {
    if (SKIP_TYPES.has(f.type)) continue;

    let correctIds: string[] = [];
    if (f.type === 'radio' && f.radioConfig?.graded && f.radioConfig.gradedCorrectOptionId) {
      correctIds = [f.radioConfig.gradedCorrectOptionId];
    } else if (f.type === 'dropdown' && f.dropdownConfig?.graded && f.dropdownConfig.gradedCorrectOptionId) {
      correctIds = [f.dropdownConfig.gradedCorrectOptionId];
    } else if (
      f.type === 'multiple' &&
      f.multipleConfig?.graded &&
      (f.multipleConfig.gradedCorrectOptionIds?.length ?? 0) > 0
    ) {
      correctIds = [...(f.multipleConfig.gradedCorrectOptionIds ?? [])];
    } else {
      continue;
    }

    const g = grading.byFieldId[f.id];
    const answerText = formatAnswerForField(f, answers);
    const opts =
      f.type === 'radio'
        ? f.radioConfig?.options
        : f.type === 'dropdown'
          ? f.dropdownConfig?.options
          : f.multipleConfig?.options;
    const norm = [...new Set(correctIds.map((x) => x.trim()).filter(Boolean))].sort();
    const correctAnswerText = norm.map((id) => optionLabel(opts, id)).join(', ') || '—';

    rows.push({
      fieldId: f.id,
      label: fieldTitle(f),
      fieldType: f.type,
      answerText: answerText || '—',
      correctAnswerText,
      effectiveCorrect: g ? g.correct : null,
      skippedFromScore: !g,
    });
  }
  return rows;
}

export function normalizeGradingStats(grading: unknown): {
  total: number;
  correct: number;
  incorrect: number;
  scorePercent: number | null;
} | null {
  if (!grading || typeof grading !== 'object') return null;
  const g = grading as HiringFormGradingSummary & { version?: number };
  const total = typeof g.gradedFieldCount === 'number' ? g.gradedFieldCount : 0;
  if (total <= 0) return null;
  const correct = typeof g.correctCount === 'number' ? g.correctCount : 0;
  const incorrect = typeof g.incorrectCount === 'number' ? g.incorrectCount : 0;
  const scorePercent =
    typeof g.scorePercent === 'number' && !Number.isNaN(g.scorePercent) ? g.scorePercent : null;
  return { total, correct, incorrect, scorePercent };
}
