'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from 'sonner';
import { Copy, Pencil, Trash2 } from 'lucide-react';

export type HiringFormListRow = {
  id: string;
  name: string;
  is_published: boolean;
  published_slug: string | null;
  created_at: string;
  updated_at: string;
  form_kind?: string;
};

type Props = {
  formKind: 'prospect' | 'quiz';
  searchQuery: string;
  formFilter: string;
  emptyMessage: string;
};

export default function HiringFormListByKind({
  formKind,
  searchQuery,
  formFilter,
  emptyMessage,
}: Props) {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const [forms, setForms] = useState<HiringFormListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HiringFormListRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const fetchForms = useCallback(async () => {
    if (!currentBusiness?.id) {
      setForms([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ formKind });
      const res = await fetch(`/api/admin/hiring/forms?${qs.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': currentBusiness.id,
        },
      });
      const json = (await res.json()) as { error?: string; forms?: HiringFormListRow[] };
      if (!res.ok) throw new Error(json.error || 'Failed to load forms');
      setForms(Array.isArray(json.forms) ? json.forms : []);
    } catch (e) {
      setForms([]);
      setError(e instanceof Error ? e.message : 'Failed to load forms');
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, formKind]);

  useEffect(() => {
    void fetchForms();
  }, [fetchForms]);

  const copyPublishedFormUrl = useCallback(async (f: HiringFormListRow) => {
    if (!f.published_slug) {
      toast.error('This form is not published yet.');
      return;
    }
    const url = `${window.location.origin}/apply/hiring/${f.published_slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy link. Check browser permissions.');
    }
  }, []);

  const filtered = forms.filter((f) => {
    const q = searchQuery.trim().toLowerCase();
    if (q && !f.name.toLowerCase().includes(q)) return false;
    if (formFilter === 'Active Forms') return f.is_published;
    if (formFilter === 'Archived Forms') return !f.is_published;
    return true;
  });

  const editHref = (f: HiringFormListRow) => {
    const base = `/admin/hiring/forms/builder?id=${f.id}&name=${encodeURIComponent(f.name)}`;
    return formKind === 'quiz' ? `${base}&kind=quiz` : base;
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !currentBusiness?.id) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/admin/hiring/forms/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'x-business-id': currentBusiness.id },
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'Delete failed');
      setDeleteTarget(null);
      await fetchForms();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!currentBusiness?.id) {
    return (
      <div className="flex flex-1 min-h-[280px] items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a business workspace to manage forms.</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex flex-1 min-h-[280px] items-center justify-center text-muted-foreground">
        <p className="text-sm">Loading forms…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-1 min-h-[280px] flex-col items-center justify-center gap-2 text-center px-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void fetchForms()}>
          Retry
        </Button>
      </div>
    );
  }
  if (filtered.length === 0) {
    const emptyCopy =
      forms.length === 0 ? emptyMessage : 'No forms match this filter or search.';
    return (
      <div className="flex flex-1 min-h-[280px] items-center justify-center text-muted-foreground">
        <p className="text-sm">{emptyCopy}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 min-h-0 overflow-auto rounded-md border border-slate-200/80">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[min(40%,320px)]">Form name</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead className="min-w-[280px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium text-slate-900">{f.name}</TableCell>
                <TableCell>
                  {f.is_published ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">Published</Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => router.push(editHref(f))}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      disabled={!f.is_published || !f.published_slug}
                      title={
                        f.is_published && f.published_slug
                          ? 'Copy public link'
                          : 'Publish the form to get a shareable link'
                      }
                      onClick={() => void copyPublishedFormUrl(f)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(f)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleteBusy && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this form?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `“${deleteTarget.name}” will be removed permanently. Submissions for this form will also be deleted.`
                : ''}
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
    </>
  );
}
