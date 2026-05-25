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
  DropdownMenuSeparator,
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
import { Search, Send, ChevronDown, Plus } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_CONTRACT = 'There is no contract form added yet.';
const ALL_CONTRACTS = '__all_contracts__';

type ContractFormRow = {
  id: string;
  name: string;
  is_published: boolean;
  published_slug: string | null;
};

type ContractSubmissionRow = {
  id: string;
  formId?: string;
  contractName?: string;
  status?: 'completed' | 'sent';
  prospectId: string | null;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  answers: Record<string, unknown>;
};

type ContractRemoveDialog =
  | { mode: 'submission'; row: ContractSubmissionRow }
  | { mode: 'invite'; prospectId: string; name: string; formId: string };

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

export default function ContractsTab() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const [searchQuery, setSearchQuery] = useState('');

  const [contractForms, setContractForms] = useState<ContractFormRow[]>([]);
  const [contractFormsLoading, setContractFormsLoading] = useState(false);

  const [submissionsFormId, setSubmissionsFormId] = useState<string>(ALL_CONTRACTS);
  const [submissions, setSubmissions] = useState<ContractSubmissionRow[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);

  const [sendOpen, setSendOpen] = useState(false);
  const [sendFormId, setSendFormId] = useState('');
  const [prospects, setProspects] = useState<HiringProspectRow[]>([]);
  const [prospectsLoading, setProspectsLoading] = useState(false);
  const [sendProspectQuery, setSendProspectQuery] = useState('');
  const [sendProspectId, setSendProspectId] = useState('');
  const [sendEmailBusy, setSendEmailBusy] = useState(false);
  const [siteOrigin, setSiteOrigin] = useState('');

  const [removeDialog, setRemoveDialog] = useState<ContractRemoveDialog | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const [resendRowId, setResendRowId] = useState<string | null>(null);

  useEffect(() => {
    setSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  }, []);

  const fetchContractForms = useCallback(async () => {
    if (!currentBusiness?.id) {
      setContractForms([]);
      return;
    }
    setContractFormsLoading(true);
    try {
      const qs = new URLSearchParams({ formKind: 'contract' });
      const res = await fetch(`/api/admin/hiring/forms?${qs.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': currentBusiness.id,
        },
      });
      const json = (await res.json()) as { error?: string; forms?: ContractFormRow[] };
      if (!res.ok) throw new Error(json.error || 'Failed to load contract forms');
      const list = Array.isArray(json.forms) ? json.forms : [];
      setContractForms(list);
      setSubmissionsFormId((prev) => {
        if (prev === ALL_CONTRACTS) return ALL_CONTRACTS;
        if (prev && list.some((f) => f.id === prev)) return prev;
        return list.length > 0 ? ALL_CONTRACTS : '';
      });
    } catch {
      setContractForms([]);
    } finally {
      setContractFormsLoading(false);
    }
  }, [currentBusiness?.id]);

  const fetchSubmissions = useCallback(async () => {
    if (!currentBusiness?.id) {
      setSubmissions([]);
      return;
    }
    if (!submissionsFormId) {
      setSubmissions([]);
      return;
    }

    if (submissionsFormId === ALL_CONTRACTS) {
      if (contractForms.length === 0) {
        setSubmissions([]);
        return;
      }
      setSubmissionsLoading(true);
      setSubmissionsError(null);
      try {
        const settled = await Promise.allSettled(
          contractForms.map(async (f) => {
            const res = await fetch(`/api/admin/hiring/forms/${f.id}/submissions`, {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'x-business-id': currentBusiness.id!,
              },
            });
            const json = (await res.json()) as {
              error?: string;
              formName?: string;
              submissions?: ContractSubmissionRow[];
            };
            if (!res.ok) throw new Error(json.error || 'Failed to load submissions');
            const list = Array.isArray(json.submissions) ? json.submissions : [];
            const contractName = json.formName?.trim() || f.name;
            return list.map((row) => ({
              ...row,
              formId: f.id,
              contractName,
            }));
          })
        );
        const errors: string[] = [];
        const merged: ContractSubmissionRow[] = [];
        for (const s of settled) {
          if (s.status === 'fulfilled') {
            merged.push(...s.value);
          } else {
            errors.push(s.reason instanceof Error ? s.reason.message : 'Request failed');
          }
        }
        if (errors.length === settled.length) {
          throw new Error(errors[0] || 'Failed to load submissions');
        }
        merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setSubmissions(merged);
      } catch (e) {
        setSubmissions([]);
        setSubmissionsError(e instanceof Error ? e.message : 'Failed to load submissions');
      } finally {
        setSubmissionsLoading(false);
      }
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
        submissions?: ContractSubmissionRow[];
      };
      if (!res.ok) throw new Error(json.error || 'Failed to load submissions');
      setSubmissions(Array.isArray(json.submissions) ? json.submissions : []);
    } catch (e) {
      setSubmissions([]);
      setSubmissionsError(e instanceof Error ? e.message : 'Failed to load submissions');
    } finally {
      setSubmissionsLoading(false);
    }
  }, [currentBusiness?.id, submissionsFormId, contractForms]);

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
    void fetchContractForms();
  }, [fetchContractForms]);

  useEffect(() => {
    void fetchSubmissions();
  }, [fetchSubmissions]);

  const publishedContracts = contractForms.filter((f) => f.is_published && f.published_slug);

  const sendContractUrl = useMemo(() => {
    const slug = publishedContracts.find((f) => f.id === sendFormId)?.published_slug?.trim() ?? '';
    if (!siteOrigin || !slug) return '';
    const base = `${siteOrigin}/apply/hiring/${slug}`;
    const pid = sendProspectId.trim();
    return pid ? `${base}?prospectId=${encodeURIComponent(pid)}` : base;
  }, [siteOrigin, publishedContracts, sendFormId, sendProspectId]);

  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter((row) => {
      const st = row.status === 'sent' ? 'email sent' : '';
      const cn = row.contractName ?? '';
      const hay = `${row.name} ${row.email} ${row.phone} ${cn} ${st}`.toLowerCase();
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

  const selectedContractName =
    submissionsFormId === ALL_CONTRACTS
      ? ''
      : contractForms.find((f) => f.id === submissionsFormId)?.name ?? '';

  const emptySubmissionsMessage =
    submissionsFormId === ALL_CONTRACTS
      ? 'No contract invites or completed responses yet for any contract form.'
      : `No contract invites or completed responses yet for "${selectedContractName}".`;

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
    const first = publishedContracts[0]?.id ?? '';
    setSendFormId(first);
    setSendProspectQuery('');
    setSendOpen(true);
    void fetchProspectsForSend();
  };

  const handleSendContractEmail = async () => {
    if (!currentBusiness?.id || !sendFormId || !sendProspectId) {
      toast.error('Select a contract form and a prospect.');
      return;
    }
    setSendEmailBusy(true);
    try {
      const res = await fetch('/api/admin/hiring/forms/send-contract-email', {
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
      toast.success('Contract link sent by email');
      setSendOpen(false);
      await fetchSubmissions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send email');
    } finally {
      setSendEmailBusy(false);
    }
  };

  const handleResendContract = async (row: ContractSubmissionRow) => {
    const formId = row.formId ?? submissionsFormId;
    if (!currentBusiness?.id || !formId || !row.prospectId) {
      toast.error('A linked prospect is required to re-send.');
      return;
    }
    const published = publishedContracts.some((f) => f.id === formId);
    if (!published) {
      toast.error('Publish this contract form before re-sending the email.');
      return;
    }
    setResendRowId(row.id);
    try {
      const res = await fetch('/api/admin/hiring/forms/send-contract-email', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': currentBusiness.id,
        },
        body: JSON.stringify({ formId, prospectId: row.prospectId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'Failed to send email');
      toast.success('Contract email sent again');
      await fetchSubmissions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Re-send failed');
    } finally {
      setResendRowId(null);
    }
  };

  const handleConfirmRemove = async () => {
    if (!removeDialog || !currentBusiness?.id) return;
    const formIdForRemove =
      removeDialog.mode === 'submission'
        ? removeDialog.row.formId ?? submissionsFormId
        : removeDialog.formId;
    if (!formIdForRemove) return;
    setRemoveBusy(true);
    try {
      if (removeDialog.mode === 'submission') {
        const res = await fetch(
          `/api/admin/hiring/forms/${formIdForRemove}/submissions/${removeDialog.row.id}`,
          {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'x-business-id': currentBusiness.id },
          }
        );
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(json.error || 'Delete failed');
        toast.success('Submission removed');
      } else {
        const qs = new URLSearchParams({ prospectId: removeDialog.prospectId });
        const res = await fetch(
          `/api/admin/hiring/forms/${formIdForRemove}/contract-email-sends?${qs}`,
          {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'x-business-id': currentBusiness.id },
          }
        );
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(json.error || 'Delete failed');
        toast.success('Invite deleted');
      }
      setRemoveDialog(null);
      await fetchSubmissions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setRemoveBusy(false);
    }
  };

  const rowStatus = (row: ContractSubmissionRow): 'completed' | 'sent' =>
    row.status === 'sent' ? 'sent' : 'completed';

  const handleView = (row: ContractSubmissionRow) => {
    if (row.prospectId) {
      router.push(`/admin/hiring?tab=prospects&prospectId=${encodeURIComponent(row.prospectId)}`);
      return;
    }
    if (row.status === 'sent') {
      toast.error('No prospect linked to open.');
      return;
    }
    const q = new URLSearchParams();
    q.set('tab', 'contracts');
    router.push(`/admin/hiring/quiz-submissions/${encodeURIComponent(row.id)}?${q.toString()}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contracts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-2 min-w-[200px]">
              <Select
                value={submissionsFormId || undefined}
                onValueChange={setSubmissionsFormId}
                disabled={contractFormsLoading || contractForms.length === 0}
              >
                <SelectTrigger
                  className="w-[min(100%,280px)]"
                  aria-label="Which contract form to show activity for"
                >
                  <SelectValue placeholder={contractFormsLoading ? 'Loading…' : 'Select a contract'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CONTRACTS}>All contracts</SelectItem>
                  {contractForms.map((f) => (
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
                placeholder="Search by name, email, or phone"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 gap-1.5"
              disabled={publishedContracts.length === 0}
              title={
                publishedContracts.length === 0
                  ? 'Publish a contract form first to send invites'
                  : 'Email a contract link or copy it to share'
              }
              onClick={handleSendOpen}
            >
              <Send className="h-4 w-4" />
              Send contract
            </Button>
            <Button
              type="button"
              className="shrink-0"
              onClick={() =>
                router.push('/admin/hiring?tab=settings-forms&formsCategory=contracts')
              }
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 -ml-1 mr-1.5">
                <Plus className="h-3.5 w-3.5" />
              </span>
              Create contract form
            </Button>
          </div>

          {!currentBusiness?.id ? (
            <p className="text-sm text-muted-foreground">Select a business workspace.</p>
          ) : contractFormsLoading ? (
            <p className="text-sm text-muted-foreground">Loading contract forms…</p>
          ) : contractForms.length === 0 ? (
            <p className="text-sm text-muted-foreground">{EMPTY_CONTRACT}</p>
          ) : submissionsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : submissionsError ? (
            <p className="text-sm text-destructive">{submissionsError}</p>
          ) : submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptySubmissionsMessage}</p>
          ) : filteredSubmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rows match your search.</p>
          ) : (
            <div className="rounded-md border border-slate-200/80 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/40">
                    {submissionsFormId === ALL_CONTRACTS ? (
                      <TableHead className="min-w-[120px]">Contract</TableHead>
                    ) : null}
                    <TableHead className="min-w-[160px]">Name</TableHead>
                    <TableHead className="min-w-[200px]">Email</TableHead>
                    <TableHead className="min-w-[120px]">Phone Number</TableHead>
                    <TableHead className="min-w-[160px]">Date Submitted</TableHead>
                    <TableHead className="min-w-[130px] w-[130px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((row) => {
                    const st = rowStatus(row);
                    const rowKey = `${row.formId ?? submissionsFormId}:${row.id}`;
                    return (
                      <TableRow key={rowKey}>
                        {submissionsFormId === ALL_CONTRACTS ? (
                          <TableCell className="text-sm text-slate-700 max-w-[200px]">
                            <span className="line-clamp-2" title={row.contractName ?? ''}>
                              {row.contractName ?? '—'}
                            </span>
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <div className="font-semibold text-slate-900">{row.name}</div>
                          {st === 'completed' ? (
                            <Badge className="mt-1.5 bg-emerald-600 hover:bg-emerald-600 text-xs font-medium">
                              Completed
                            </Badge>
                          ) : (
                            <Badge className="mt-1.5 bg-amber-600 hover:bg-amber-600 text-xs font-medium">
                              Email sent
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">{row.email}</TableCell>
                        <TableCell className="text-sm text-slate-700">{row.phone}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatSubmittedAt(row.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {st === 'completed' || (st === 'sent' && row.prospectId) ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  disabled={st === 'sent' && resendRowId === row.id}
                                >
                                  Options
                                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => handleView(row)}>View</DropdownMenuItem>
                                {st === 'sent' ? (
                                  <DropdownMenuItem
                                    disabled={
                                      !row.prospectId ||
                                      !publishedContracts.some(
                                        (f) => f.id === (row.formId ?? submissionsFormId)
                                      ) ||
                                      resendRowId === row.id
                                    }
                                    onClick={() => void handleResendContract(row)}
                                  >
                                    {resendRowId === row.id ? 'Sending…' : 'Re-send'}
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    if (st === 'completed') {
                                      setRemoveDialog({ mode: 'submission', row });
                                    } else if (row.prospectId) {
                                      const fid = row.formId ?? submissionsFormId;
                                      if (!fid) return;
                                      setRemoveDialog({
                                        mode: 'invite',
                                        prospectId: row.prospectId,
                                        name: row.name,
                                        formId: fid,
                                      });
                                    }
                                  }}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={sendOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSendOpen(false);
            setSendProspectQuery('');
          } else {
            setSendOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Choose a published contract form and a prospect. We email them a link to complete the contract.
              You can still copy the link below to share manually.
            </p>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Contract form</Label>
              <Select value={sendFormId || undefined} onValueChange={setSendFormId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select contract" />
                </SelectTrigger>
                <SelectContent>
                  {publishedContracts.map((f) => (
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
                  No prospects yet. Add people under the <span className="font-medium">Onboarding</span> tab
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
              <Input readOnly value={sendContractUrl} className="font-mono text-xs" />
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setSendOpen(false)}>
              Close
            </Button>
            <Button type="button" variant="outline" onClick={() => void copyUrl(sendContractUrl)}>
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
              onClick={() => void handleSendContractEmail()}
            >
              {sendEmailBusy ? 'Sending…' : 'Send email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!removeDialog}
        onOpenChange={(open) => !open && !removeBusy && setRemoveDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removeDialog?.mode === 'invite' ? 'Delete pending invite?' : 'Delete this submission?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removeDialog?.mode === 'invite' ? (
                <>
                  This deletes the &quot;Email sent&quot; row for {removeDialog.name}. Their old link may still
                  work until you send a new invite; this only removes the list entry.
                </>
              ) : removeDialog?.mode === 'submission' ? (
                <>
                  This removes the response for {removeDialog.row.name}. This cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeBusy}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={removeBusy}
              onClick={() => void handleConfirmRemove()}
            >
              {removeBusy ? 'Deleting…' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
