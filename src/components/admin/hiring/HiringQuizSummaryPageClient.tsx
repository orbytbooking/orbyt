'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBusiness } from '@/contexts/BusinessContext';
import type { GradedQuizReviewRow, QuizSummaryQuestionRow } from '@/lib/hiring-quiz-summary-display';
import { toast } from 'sonner';
import HiringHiringTabStrip from '@/components/admin/hiring/HiringHiringTabStrip';
import {
  HiringFormPreviewView,
  type HiringFormPreviewPayload,
} from '@/app/admin/hiring/forms/builder/page';

type SummaryPayload = {
  submissionId: string;
  prospectId: string | null;
  formName: string;
  formKind?: string;
  submittedAt: string;
  prospect: { firstName: string; lastName: string; email: string; phone: string };
  stats: { total: number; correct: number; incorrect: number; scorePercent: number | null } | null;
  questions: QuizSummaryQuestionRow[];
  gradedRows: GradedQuizReviewRow[];
  manualGrading: Record<string, string>;
  submissionAnswers?: Record<string, unknown>;
  previewDefinition?: unknown;
};

function fmtPct(n: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n.toFixed(2)}%`;
}

function fmtSubmittedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function buildContractPreviewPayload(
  businessId: string,
  formNameFallback: string,
  previewDefinition: unknown
): HiringFormPreviewPayload | null {
  if (!previewDefinition || typeof previewDefinition !== 'object') return null;
  const d = previewDefinition as Partial<HiringFormPreviewPayload>;
  if (d.v !== 1 || !Array.isArray(d.formFields) || d.formFields.length === 0) return null;
  return {
    ...(d as HiringFormPreviewPayload),
    v: 1,
    businessId,
    formName: typeof d.formName === 'string' && d.formName.trim() ? d.formName.trim() : formNameFallback,
  };
}

/** Read-only display (not an input) so completed contracts are clearly not editable. */
function ReadOnlyAnswerBlock({ label, value }: { label: string; value: string }) {
  const display = value?.trim() ? value : '—';
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium text-slate-900">{label}</div>
      <div className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-800 whitespace-pre-wrap break-words">
        {display}
      </div>
    </div>
  );
}

const MANUAL_AUTO = 'auto';

const MANUAL_OPTIONS = [
  { value: MANUAL_AUTO, label: 'Select' },
  { value: 'correct', label: 'Correct' },
  { value: 'incorrect', label: 'Incorrect' },
  { value: 'skip', label: 'Skip' },
] as const;

export default function HiringQuizSummaryPageClient({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prospectIdParam = searchParams.get('prospectId')?.trim() ?? '';
  const tabParam = searchParams.get('tab')?.trim() || 'quizzes';

  const { currentBusiness } = useBusiness();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SummaryPayload | null>(null);
  const [manualDraft, setManualDraft] = useState<Record<string, string>>({});
  const [updateBusy, setUpdateBusy] = useState(false);
  const [rejectBusy, setRejectBusy] = useState(false);

  const load = useCallback(async () => {
    if (!currentBusiness?.id || !submissionId?.trim()) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hiring/form-submissions/${encodeURIComponent(submissionId)}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': currentBusiness.id,
        },
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string } & Partial<SummaryPayload>;
      if (!res.ok) throw new Error(json.error || 'Failed to load submission');
      const manual = (json.manualGrading ?? {}) as Record<string, string>;
      setManualDraft(manual);
      setData({
        submissionId: String(json.submissionId ?? submissionId),
        prospectId: (json.prospectId as string | null | undefined) ?? null,
        formName: String(json.formName ?? 'Form'),
        formKind: String(json.formKind ?? 'prospect'),
        submittedAt: String(json.submittedAt ?? ''),
        prospect: json.prospect ?? { firstName: '', lastName: '', email: '', phone: '' },
        stats: json.stats ?? null,
        questions: Array.isArray(json.questions) ? json.questions : [],
        gradedRows: Array.isArray(json.gradedRows) ? json.gradedRows : [],
        manualGrading: manual,
        submissionAnswers:
          json.submissionAnswers && typeof json.submissionAnswers === 'object'
            ? (json.submissionAnswers as Record<string, unknown>)
            : undefined,
        previewDefinition: json.previewDefinition,
      });
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, submissionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isContract = data?.formKind === 'contract';
  const stats = data?.stats;
  const rejectProspectId = data?.prospectId ?? (prospectIdParam || null);

  const contractFrozenPreview = useMemo(() => {
    if (!isContract || !data || !currentBusiness?.id) return null;
    const payload = buildContractPreviewPayload(
      currentBusiness.id,
      data.formName,
      data.previewDefinition
    );
    const answers = data.submissionAnswers;
    if (!payload || !answers || typeof answers !== 'object') return null;
    return { payload, answers };
  }, [isContract, data, currentBusiness?.id]);

  const manualPayload = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(manualDraft)) {
      if (v === 'correct' || v === 'incorrect' || v === 'skip') out[k] = v;
    }
    return out;
  }, [manualDraft]);

  const handleUpdate = async () => {
    if (!currentBusiness?.id || isContract) return;
    setUpdateBusy(true);
    try {
      const res = await fetch(`/api/admin/hiring/form-submissions/${encodeURIComponent(submissionId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': currentBusiness.id,
        },
        body: JSON.stringify({ manualGrading: manualPayload }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'Update failed');
      toast.success('Quiz grading updated');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setUpdateBusy(false);
    }
  };

  const handleReject = async () => {
    if (!currentBusiness?.id || !rejectProspectId || isContract) {
      if (isContract) return;
      toast.error('No prospect is linked to this submission.');
      return;
    }
    setRejectBusy(true);
    try {
      const res = await fetch(`/api/admin/hiring/prospects/${encodeURIComponent(rejectProspectId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': currentBusiness.id,
        },
        body: JSON.stringify({ stage: 'rejected' }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'Reject failed');
      toast.success('Prospect rejected');
      router.push('/admin/hiring?tab=prospects');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setRejectBusy(false);
    }
  };

  return (
    <Tabs value={tabParam} onValueChange={() => {}} className="w-full space-y-6">
      <HiringHiringTabStrip
        value={tabParam}
        onValueChange={() => {}}
        navigateOnTabChange
        prospectIdForProspectsTab={prospectIdParam || null}
      />

      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 sm:px-6">
        <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {isContract ? 'Contract response' : 'Quiz Summary'}
              </h1>
              {data?.formName ? (
                <p className="text-sm text-muted-foreground mt-1">{data.formName}</p>
              ) : null}
              {isContract && data?.submittedAt ? (
                <p className="text-sm text-muted-foreground mt-2">
                  Submitted {fmtSubmittedAt(data.submittedAt)}
                </p>
              ) : null}
            </div>
            {!isContract && stats ? (
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4 lg:gap-8">
                <div>
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Total</div>
                  <div className="text-lg font-semibold tabular-nums">{stats.total}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Correct</div>
                  <div className="text-lg font-semibold text-emerald-600 tabular-nums">{stats.correct}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Incorrect</div>
                  <div className="text-lg font-semibold text-rose-600 tabular-nums">{stats.incorrect}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Grading score
                  </div>
                  <div className="text-lg font-semibold tabular-nums">{fmtPct(stats.scorePercent)}</div>
                </div>
              </div>
            ) : !isContract ? (
              <p className="text-sm text-muted-foreground lg:text-right">No grading data for this submission.</p>
            ) : (
              <p className="text-sm text-muted-foreground lg:text-right max-w-sm">
                This is a read-only record of the signed contract fields.
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : data ? (
          <>
            {isContract ? (
              <>
                {contractFrozenPreview ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-card shadow-sm ring-1 ring-black/[0.03]">
                    <HiringFormPreviewView
                      payload={contractFrozenPreview.payload}
                      appearance="preview"
                      frozenSubmissionAnswers={contractFrozenPreview.answers}
                    />
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6 space-y-4">
                      <div className="text-sm font-semibold text-slate-900">Respondent</div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <ReadOnlyAnswerBlock label="First name" value={data.prospect.firstName} />
                        <ReadOnlyAnswerBlock label="Last name" value={data.prospect.lastName} />
                      </div>
                      <ReadOnlyAnswerBlock label="Email" value={data.prospect.email} />
                      <ReadOnlyAnswerBlock label="Phone number" value={data.prospect.phone} />
                    </div>

                    {data.questions.length > 0 ? (
                      <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6 space-y-4">
                        <div className="text-sm font-semibold text-slate-900">Contract</div>
                        <p className="text-xs text-muted-foreground">
                          Values below are what the candidate submitted. This response cannot be edited here.
                        </p>
                        <div className="space-y-4">
                          {data.questions.map((q) => (
                            <ReadOnlyAnswerBlock key={q.fieldId} label={q.label} value={q.answerText} />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}

                <div className="flex flex-wrap gap-2 border-t pt-6">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/admin/hiring?tab=contracts">Back to contracts</Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>
                        First name <span className="text-destructive">*</span>
                      </Label>
                      <Input readOnly value={data.prospect.firstName} className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Last name <span className="text-destructive">*</span>
                      </Label>
                      <Input readOnly value={data.prospect.lastName} className="bg-muted/50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input readOnly value={data.prospect.email} className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Phone number <span className="text-destructive">*</span>
                    </Label>
                    <Input readOnly value={data.prospect.phone || '—'} className="bg-muted/50" />
                  </div>
                </div>

                {data.gradedRows.length > 0 ? (
                  <div className="space-y-4">
                    {data.gradedRows.map((row) => (
                      <div key={row.fieldId} className="rounded-xl border bg-card p-5 shadow-sm sm:p-6 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-base font-medium leading-snug">{row.label}</Label>
                          <Input readOnly value={row.answerText} className="bg-muted/50" />
                        </div>
                        <div className="flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-end sm:justify-between">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Correct answer: </span>
                            <span className="font-medium text-emerald-600">{row.correctAnswerText}</span>
                            {row.skippedFromScore ? (
                              <span className="ml-2 text-xs text-amber-700">(Skipped from score)</span>
                            ) : row.effectiveCorrect === true ? (
                              <span className="ml-2 text-xs text-emerald-600">(Auto: correct)</span>
                            ) : row.effectiveCorrect === false ? (
                              <span className="ml-2 text-xs text-rose-600">(Auto: incorrect)</span>
                            ) : null}
                          </div>
                          <div className="w-full sm:w-56 space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Manual grade</Label>
                            <Select
                              value={manualDraft[row.fieldId] ?? MANUAL_AUTO}
                              onValueChange={(v) =>
                                setManualDraft((prev) => {
                                  const next = { ...prev };
                                  if (!v || v === MANUAL_AUTO) delete next[row.fieldId];
                                  else next[row.fieldId] = v;
                                  return next;
                                })
                              }
                            >
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {MANUAL_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
                    This quiz has no graded multiple-choice style questions.
                  </div>
                )}

                {(() => {
                  const gradedIds = new Set(data.gradedRows.map((r) => r.fieldId));
                  const others = data.questions.filter((q) => !gradedIds.has(q.fieldId));
                  if (others.length === 0) return null;
                  return (
                    <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6 space-y-4">
                      <div className="text-sm font-semibold text-slate-900">Other responses</div>
                      <div className="space-y-4">
                        {others.map((q) => (
                          <div key={q.fieldId} className="space-y-2">
                            <Label className="text-sm font-medium leading-snug">{q.label}</Label>
                            <Input readOnly value={q.answerText} className="bg-muted/50" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex flex-wrap gap-2 border-t pt-6">
                  <Button
                    type="button"
                    onClick={() => void handleUpdate()}
                    disabled={updateBusy || loading || !data?.gradedRows?.length}
                  >
                    {updateBusy ? 'Updating…' : 'Update'}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void handleReject()}
                    disabled={rejectBusy || !rejectProspectId}
                  >
                    {rejectBusy ? 'Rejecting…' : 'Reject'}
                  </Button>
                </div>
              </>
            )}
          </>
        ) : null}
      </main>
    </Tabs>
  );
}
