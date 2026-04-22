'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBusiness } from '@/contexts/BusinessContext';
import { Search, Plus, Send, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_QUIZ = 'There is no quiz form added yet.';

type QuizFormRow = {
  id: string;
  name: string;
  is_published: boolean;
  published_slug: string | null;
};

type QuizSubmissionRow = {
  id: string;
  prospectId: string | null;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  gradedLabel: string;
  scoreLabel: string;
  answers: Record<string, unknown>;
};

type HiringProspectRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
};

function prospectLabel(p: HiringProspectRow): string {
  const n = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  return n || p.email || 'Prospect';
}

export default function QuizzesTab() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState('');

  const [quizForms, setQuizForms] = useState<QuizFormRow[]>([]);
  const [quizFormsLoading, setQuizFormsLoading] = useState(false);

  const [submissionsFormId, setSubmissionsFormId] = useState<string>('');
  const [submissions, setSubmissions] = useState<QuizSubmissionRow[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);

  const [sendOpen, setSendOpen] = useState(false);
  const [sendFormId, setSendFormId] = useState<string>('');
  const [prospects, setProspects] = useState<HiringProspectRow[]>([]);
  const [prospectsLoading, setProspectsLoading] = useState(false);
  const [sendProspectQuery, setSendProspectQuery] = useState('');
  const [sendProspectId, setSendProspectId] = useState<string>('');
  const [sendEmailBusy, setSendEmailBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<QuizSubmissionRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const fetchQuizForms = useCallback(async () => {
    if (!currentBusiness?.id) {
      setQuizForms([]);
      return;
    }
    setQuizFormsLoading(true);
    try {
      const qs = new URLSearchParams({ formKind: 'quiz' });
      const res = await fetch(`/api/admin/hiring/forms?${qs}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': currentBusiness.id,
        },
      });
      const json = (await res.json()) as { error?: string; forms?: QuizFormRow[] };
      if (!res.ok) throw new Error(json.error || 'Failed to load quizzes');
      const list = Array.isArray(json.forms) ? json.forms : [];
      setQuizForms(list);
      setSubmissionsFormId((prev) => {
        if (prev && list.some((f) => f.id === prev)) return prev;
        return list[0]?.id ?? '';
      });
    } catch {
      setQuizForms([]);
    } finally {
      setQuizFormsLoading(false);
    }
  }, [currentBusiness?.id]);

  const fetchSubmissions = useCallback(async () => {
    if (!currentBusiness?.id || !submissionsFormId) {
      setSubmissions([]);
      return;
    }
    setSubmissionsLoading(true);
    setSubmissionsError(null);
    try {
      const res = await fetch(`/api/admin/hiring/forms/${submissionsFormId}/submissions`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': currentBusiness.id,
        },
      });
      const json = (await res.json()) as {
        error?: string;
        submissions?: QuizSubmissionRow[];
      };
      if (!res.ok) throw new Error(json.error || 'Failed to load submissions');
      setSubmissions(Array.isArray(json.submissions) ? json.submissions : []);
    } catch (e) {
      setSubmissions([]);
      setSubmissionsError(e instanceof Error ? e.message : 'Failed to load submissions');
    } finally {
      setSubmissionsLoading(false);
    }
  }, [currentBusiness?.id, submissionsFormId]);

  const fetchProspectsForSend = useCallback(async () => {
    if (!currentBusiness?.id) {
      setProspects([]);
      return;
    }
    setProspectsLoading(true);
    try {
      const res = await fetch('/api/admin/hiring/prospects', {
        credentials: 'include',
        headers: { 'x-business-id': currentBusiness.id },
      });
      const json = (await res.json()) as { error?: string; prospects?: HiringProspectRow[] };
      if (!res.ok) throw new Error(json.error || 'Failed to load prospects');
      const list = Array.isArray(json.prospects) ? json.prospects : [];
      const mapped: HiringProspectRow[] = list.map((r) => ({
        id: r.id,
        first_name: String((r as HiringProspectRow).first_name ?? ''),
        last_name: (r as HiringProspectRow).last_name ?? null,
        email: String((r as HiringProspectRow).email ?? ''),
      }));
      setProspects(mapped);
      setSendProspectId((prev) => {
        if (prev && mapped.some((p) => p.id === prev)) return prev;
        return mapped[0]?.id ?? '';
      });
    } catch {
      setProspects([]);
      setSendProspectId('');
    } finally {
      setProspectsLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    void fetchQuizForms();
  }, [fetchQuizForms]);

  useEffect(() => {
    void fetchSubmissions();
  }, [fetchSubmissions]);

  const publishedQuizzes = quizForms.filter((f) => f.is_published && f.published_slug);
  const sendQuizUrl =
    sendFormId && typeof window !== 'undefined'
      ? `${window.location.origin}/apply/hiring/${publishedQuizzes.find((f) => f.id === sendFormId)?.published_slug ?? ''}`
      : '';

  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter((row) => {
      const hay = `${row.name} ${row.email} ${row.phone}`.toLowerCase();
      return hay.includes(q);
    });
  }, [submissions, searchQuery]);

  const filteredProspectsForSend = useMemo(() => {
    const q = sendProspectQuery.trim().toLowerCase();
    if (!q) return prospects;
    return prospects.filter((p) => {
      const name = `${p.first_name} ${p.last_name ?? ''}`.toLowerCase();
      return name.includes(q) || p.email.toLowerCase().includes(q);
    });
  }, [prospects, sendProspectQuery]);

  useEffect(() => {
    if (!sendOpen) return;
    if (filteredProspectsForSend.some((p) => p.id === sendProspectId)) return;
    setSendProspectId(filteredProspectsForSend[0]?.id ?? '');
  }, [sendOpen, filteredProspectsForSend, sendProspectId]);

  const handleCreateNext = () => {
    const name = formName.trim() || 'Untitled quiz';
    setCreateOpen(false);
    setFormName('');
    router.push(
      `/admin/hiring/forms/builder?name=${encodeURIComponent(name)}&kind=quiz`
    );
  };

  const copyUrl = async (url: string) => {
    if (!url) {
      toast.error('No link available.');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy link.');
    }
  };

  const handleSendOpen = () => {
    const first = publishedQuizzes[0]?.id ?? '';
    setSendFormId(first);
    setSendProspectQuery('');
    setSendOpen(true);
    void fetchProspectsForSend();
  };

  const handleSendQuizEmail = async () => {
    if (!currentBusiness?.id || !sendFormId || !sendProspectId) {
      toast.error('Select a quiz and a prospect.');
      return;
    }
    setSendEmailBusy(true);
    try {
      const res = await fetch('/api/admin/hiring/forms/send-quiz-email', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': currentBusiness.id,
        },
        body: JSON.stringify({ formId: sendFormId, prospectId: sendProspectId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'Failed to send email');
      toast.success('Quiz link sent by email');
      setSendOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send email');
    } finally {
      setSendEmailBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !currentBusiness?.id || !submissionsFormId) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(
        `/api/admin/hiring/forms/${submissionsFormId}/submissions/${deleteTarget.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'x-business-id': currentBusiness.id },
        }
      );
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'Delete failed');
      setDeleteTarget(null);
      toast.success('Submission removed');
      await fetchSubmissions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleteBusy(false);
    }
  };

  const formatSubmittedAt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  const selectedQuizName = quizForms.find((f) => f.id === submissionsFormId)?.name ?? '';

  const goViewSubmissionDetails = (row: QuizSubmissionRow) => {
    const q = new URLSearchParams();
    q.set('tab', row.prospectId ? 'prospects' : 'quizzes');
    if (row.prospectId) q.set('prospectId', row.prospectId);
    router.push(`/admin/hiring/quiz-submissions/${encodeURIComponent(row.id)}?${q.toString()}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quizzes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-2 min-w-[200px]">
              <Select
                value={submissionsFormId || undefined}
                onValueChange={setSubmissionsFormId}
                disabled={quizFormsLoading || quizForms.length === 0}
              >
                <SelectTrigger
                  className="w-[min(100%,280px)]"
                  aria-label="Which quiz to show submissions for"
                >
                  <SelectValue placeholder={quizFormsLoading ? 'Loading…' : 'Select a quiz'} />
                </SelectTrigger>
                <SelectContent>
                  {quizForms.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                      {!f.is_published ? ' (draft)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search respondents"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 gap-1.5"
              disabled={publishedQuizzes.length === 0}
              title={
                publishedQuizzes.length === 0
                  ? 'Publish a quiz first to get a shareable link'
                  : 'Copy or share the public quiz link'
              }
              onClick={handleSendOpen}
            >
              <Send className="h-4 w-4" />
              Send quiz
            </Button>
            <Button type="button" className="shrink-0" onClick={() => setCreateOpen(true)}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 -ml-1 mr-1.5">
                <Plus className="h-3.5 w-3.5" />
              </span>
              Create quiz
            </Button>
          </div>

          {!currentBusiness?.id ? (
            <p className="text-sm text-muted-foreground">Select a business workspace.</p>
          ) : !submissionsFormId ? (
            <p className="text-sm text-muted-foreground">{EMPTY_QUIZ}</p>
          ) : submissionsLoading ? (
            <p className="text-sm text-muted-foreground">Loading submissions…</p>
          ) : submissionsError ? (
            <p className="text-sm text-destructive">{submissionsError}</p>
          ) : submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No submissions yet for &quot;{selectedQuizName}&quot;.
            </p>
          ) : filteredSubmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No respondents match your search.</p>
          ) : (
            <div className="rounded-md border border-slate-200/80 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/40">
                    <TableHead className="min-w-[160px]">Name</TableHead>
                    <TableHead className="min-w-[200px]">Email</TableHead>
                    <TableHead className="min-w-[120px]">Phone number</TableHead>
                    <TableHead className="w-[90px]">Graded</TableHead>
                    <TableHead className="w-[90px]">Score</TableHead>
                    <TableHead className="min-w-[160px]">Date submitted</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{row.name}</div>
                        <Badge className="mt-1.5 bg-emerald-600 hover:bg-emerald-600 text-xs font-medium">
                          Completed
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">{row.email}</TableCell>
                      <TableCell className="text-sm text-slate-700">{row.phone}</TableCell>
                      <TableCell className="text-sm">{row.gradedLabel}</TableCell>
                      <TableCell className="text-sm font-medium">{row.scoreLabel}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatSubmittedAt(row.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="gap-1">
                              Options
                              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => goViewSubmissionDetails(row)}>View details</DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(row)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setFormName('');
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900">Create quiz</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="quiz-name" className="text-sm font-medium text-slate-900">
              Quiz name
            </Label>
            <Input
              id="quiz-name"
              placeholder="Enter quiz name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="border-slate-200"
            />
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button type="button" onClick={handleCreateNext}>
              Next
            </Button>
            <Button type="button" variant="destructive" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={sendOpen}
        onOpenChange={(open) => {
          setSendOpen(open);
          if (!open) setSendProspectQuery('');
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send quiz</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Choose a published quiz and a prospect. We email them a link to complete the quiz. You can
              still copy the link below to share manually.
            </p>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quiz</Label>
              <Select value={sendFormId || undefined} onValueChange={setSendFormId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select quiz" />
                </SelectTrigger>
                <SelectContent>
                  {publishedQuizzes.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prospect</Label>
              <Input
                placeholder="Search by name or email"
                value={sendProspectQuery}
                onChange={(e) => setSendProspectQuery(e.target.value)}
                className="mb-2"
              />
              {prospectsLoading ? (
                <p className="text-sm text-muted-foreground">Loading prospects…</p>
              ) : prospects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No prospects yet. Add people under the <span className="font-medium">Prospects</span> tab
                  first.
                </p>
              ) : filteredProspectsForSend.length === 0 ? (
                <p className="text-sm text-muted-foreground">No prospects match your search.</p>
              ) : (
                <Select value={sendProspectId || undefined} onValueChange={setSendProspectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select prospect" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProspectsForSend.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {prospectLabel(p)} — {p.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Public link</Label>
              <Input readOnly value={sendQuizUrl} className="font-mono text-xs" />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setSendOpen(false)}>
              Close
            </Button>
            <Button type="button" variant="outline" onClick={() => void copyUrl(sendQuizUrl)}>
              Copy link
            </Button>
            <Button
              type="button"
              disabled={
                sendEmailBusy ||
                !sendFormId ||
                !sendProspectId ||
                prospectsLoading ||
                filteredProspectsForSend.length === 0
              }
              onClick={() => void handleSendQuizEmail()}
            >
              {sendEmailBusy ? 'Sending…' : 'Send email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteBusy && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the response for {deleteTarget?.name ?? 'this respondent'}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteBusy}
              onClick={() => void handleConfirmDelete()}
            >
              {deleteBusy ? 'Deleting…' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
