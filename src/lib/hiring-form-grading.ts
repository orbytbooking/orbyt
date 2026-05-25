type Option = { id: string; label: string };

type FormFieldLike = {
  id: string;
  type: string;
  hidden?: boolean;
  radioConfig?: {
    graded?: boolean;
    gradedCorrectOptionId?: string;
    options?: Option[];
  };
  dropdownConfig?: {
    graded?: boolean;
    gradedCorrectOptionId?: string;
    options?: Option[];
  };
  multipleConfig?: {
    graded?: boolean;
    /** Correct answers for multiple choice (order-independent). */
    gradedCorrectOptionIds?: string[];
    options?: Option[];
  };
};

export type HiringFormFieldGrade = {
  fieldType: 'radio' | 'dropdown' | 'multiple';
  correct: boolean;
  expectedOptionIds: string[];
  answeredOptionIds: string[];
};

export type HiringFormGradingSummary = {
  version: 2;
  gradedFieldCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredGradedCount: number;
  scorePercent: number | null;
  byFieldId: Record<string, HiringFormFieldGrade>;
};

function asFields(raw: unknown): FormFieldLike[] {
  if (!Array.isArray(raw)) return [];
  return raw as FormFieldLike[];
}

function normIds(ids: string[]): string[] {
  return [...new Set(ids.map((s) => s.trim()).filter(Boolean))].sort();
}

function readStringAnswer(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  return String(raw).trim();
}

function readMultiAnswer(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((v) => (typeof v === 'string' ? v.trim() : String(v).trim())).filter(Boolean);
  }
  const s = readStringAnswer(raw);
  return s ? [s] : [];
}

function arraysEqualSorted(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Score graded radio, dropdown, and multiple-choice fields. Caller should only invoke for quiz forms.
 */
export function computeHiringFormGrading(
  formFields: unknown[],
  answers: Record<string, unknown>
): HiringFormGradingSummary | null {
  const fields = asFields(formFields);
  const byFieldId: Record<string, HiringFormFieldGrade> = {};
  let gradedFieldCount = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredGradedCount = 0;

  for (const field of fields) {
    if (field.hidden) continue;

    if (field.type === 'radio') {
      const cfg = field.radioConfig;
      if (!cfg?.graded || !cfg.gradedCorrectOptionId) continue;
      const expected = normIds([cfg.gradedCorrectOptionId]);
      const answeredRaw = readStringAnswer(answers[field.id]);
      const answered = answeredRaw ? normIds([answeredRaw]) : [];

      gradedFieldCount += 1;
      if (answered.length === 0) {
        unansweredGradedCount += 1;
        byFieldId[field.id] = {
          fieldType: 'radio',
          correct: false,
          expectedOptionIds: expected,
          answeredOptionIds: answered,
        };
        continue;
      }
      const correct = arraysEqualSorted(answered, expected);
      if (correct) correctCount += 1;
      else incorrectCount += 1;
      byFieldId[field.id] = {
        fieldType: 'radio',
        correct,
        expectedOptionIds: expected,
        answeredOptionIds: answered,
      };
      continue;
    }

    if (field.type === 'dropdown') {
      const cfg = field.dropdownConfig;
      if (!cfg?.graded || !cfg.gradedCorrectOptionId) continue;
      const expected = normIds([cfg.gradedCorrectOptionId]);
      const answeredRaw = readStringAnswer(answers[field.id]);
      const answered = answeredRaw ? normIds([answeredRaw]) : [];

      gradedFieldCount += 1;
      if (answered.length === 0) {
        unansweredGradedCount += 1;
        byFieldId[field.id] = {
          fieldType: 'dropdown',
          correct: false,
          expectedOptionIds: expected,
          answeredOptionIds: answered,
        };
        continue;
      }
      const correct = arraysEqualSorted(answered, expected);
      if (correct) correctCount += 1;
      else incorrectCount += 1;
      byFieldId[field.id] = {
        fieldType: 'dropdown',
        correct,
        expectedOptionIds: expected,
        answeredOptionIds: answered,
      };
      continue;
    }

    if (field.type === 'multiple') {
      const cfg = field.multipleConfig;
      const expectedRaw = cfg?.gradedCorrectOptionIds ?? [];
      if (!cfg?.graded || expectedRaw.length === 0) continue;
      const expected = normIds(expectedRaw);
      const answered = normIds(readMultiAnswer(answers[field.id]));

      gradedFieldCount += 1;
      if (answered.length === 0) {
        unansweredGradedCount += 1;
        byFieldId[field.id] = {
          fieldType: 'multiple',
          correct: false,
          expectedOptionIds: expected,
          answeredOptionIds: answered,
        };
        continue;
      }
      const correct = arraysEqualSorted(answered, expected);
      if (correct) correctCount += 1;
      else incorrectCount += 1;
      byFieldId[field.id] = {
        fieldType: 'multiple',
        correct,
        expectedOptionIds: expected,
        answeredOptionIds: answered,
      };
    }
  }

  if (gradedFieldCount === 0) return null;

  const scorePercent =
    gradedFieldCount > 0 ? Math.round((correctCount / gradedFieldCount) * 1000) / 10 : null;

  return {
    version: 2,
    gradedFieldCount,
    correctCount,
    incorrectCount,
    unansweredGradedCount,
    scorePercent,
    byFieldId,
  };
}

export type ManualGradeOverride = 'correct' | 'incorrect' | 'skip';

export function parseManualGradingFromAnswers(raw: unknown): Partial<Record<string, ManualGradeOverride>> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Partial<Record<string, ManualGradeOverride>> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === 'correct' || v === 'incorrect' || v === 'skip') {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Re-score a submission after admin overrides. Skipped fields are omitted from totals.
 * Correct / incorrect counts treat unanswered + manual incorrect as incorrect.
 */
export function applyManualGradingOverrides(
  base: HiringFormGradingSummary,
  overrides: Partial<Record<string, ManualGradeOverride>>
): HiringFormGradingSummary {
  const byFieldId: Record<string, HiringFormFieldGrade> = {};
  let gradedFieldCount = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredGradedCount = 0;

  for (const [id, g] of Object.entries(base.byFieldId)) {
    const o = overrides[id];
    if (o === 'skip') continue;

    const g2: HiringFormFieldGrade = { ...g };
    if (o === 'correct') g2.correct = true;
    else if (o === 'incorrect') g2.correct = false;

    const unanswered = g2.answeredOptionIds.length === 0;
    byFieldId[id] = g2;
    gradedFieldCount += 1;

    if (g2.correct) correctCount += 1;
    else incorrectCount += 1;

    if (unanswered) unansweredGradedCount += 1;
  }

  const scorePercent =
    gradedFieldCount > 0 ? Math.round((correctCount / gradedFieldCount) * 1000) / 10 : null;

  return {
    version: 2,
    gradedFieldCount,
    correctCount,
    incorrectCount,
    unansweredGradedCount,
    scorePercent,
    byFieldId,
  };
}
