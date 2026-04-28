'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RichTextEditor } from '@/components/admin/hiring/RichTextEditor';
import {
  type HiringDedicatedThankYouPage,
  type HiringFormSubmissionSettings,
  createEmptyHiringThankYouPage,
} from '@/app/admin/hiring/forms/builder/hiring-form-submission-settings';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';

type Props = {
  submissionSettings: HiringFormSubmissionSettings;
  setSubmissionSettings: Dispatch<SetStateAction<HiringFormSubmissionSettings>>;
  siteOrigin: string;
  publishedSlugInput: string;
};

export function ThankYouPagesSettingsPanel({
  submissionSettings,
  setSubmissionSettings,
  siteOrigin,
  publishedSlugInput,
}: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<HiringDedicatedThankYouPage>(() => createEmptyHiringThankYouPage());

  const pages = submissionSettings.dedicatedThankYouPages ?? [];

  useEffect(() => {
    if (!editorOpen) {
      setDraft(createEmptyHiringThankYouPage());
      setEditingId(null);
    }
  }, [editorOpen]);

  const openNew = () => {
    setDraft(createEmptyHiringThankYouPage());
    setEditingId(null);
    setEditorOpen(true);
  };

  const openEdit = (row: HiringDedicatedThankYouPage) => {
    setDraft({ ...row });
    setEditingId(row.id);
    setEditorOpen(true);
  };

  const saveEditor = () => {
    setSubmissionSettings((prev) => {
      const list = [...(prev.dedicatedThankYouPages ?? [])];
      const d = draft;
      const idx = list.findIndex((p) => p.id === d.id);
      if (editingId !== null) {
        if (idx >= 0) list[idx] = { ...d };
        else list.push({ ...d });
      } else {
        if (idx < 0) list.push({ ...d });
        else list[idx] = { ...d };
      }
      let defaultThankYouPageId = prev.defaultThankYouPageId;
      if (!defaultThankYouPageId || !list.some((p) => p.id === defaultThankYouPageId)) {
        defaultThankYouPageId = list[0]?.id;
      }
      return { ...prev, dedicatedThankYouPages: list, defaultThankYouPageId };
    });
    setEditorOpen(false);
  };

  const cancelEditor = () => {
    setEditorOpen(false);
  };

  const deleteRow = (id: string) => {
    if (!window.confirm('Remove this thank you page?')) return;
    setSubmissionSettings((prev) => {
      const list = (prev.dedicatedThankYouPages ?? []).filter((p) => p.id !== id);
      let defaultThankYouPageId = prev.defaultThankYouPageId;
      if (defaultThankYouPageId === id) defaultThankYouPageId = list[0]?.id;
      if (defaultThankYouPageId && !list.some((p) => p.id === defaultThankYouPageId)) {
        defaultThankYouPageId = list[0]?.id;
      }
      return {
        ...prev,
        dedicatedThankYouPages: list,
        defaultThankYouPageId: list.length ? defaultThankYouPageId : undefined,
      };
    });
  };

  const copyPageUrl = (pageSlug: string) => {
    const formSlug = publishedSlugInput.trim();
    const slug = pageSlug.trim();
    if (!formSlug || !slug) {
      window.alert('Set the form slug (Form settings) and a page URL slug first.');
      return;
    }
    const url = `${siteOrigin || window.location.origin}/apply/hiring/${formSlug}/thank-you/${slug}`;
    void navigator.clipboard.writeText(url).then(
      () => {},
      () => window.alert(url)
    );
  };

  const rowTitle = (row: HiringDedicatedThankYouPage) => {
    const t = row.name.trim();
    return t || 'Untitled thank you page';
  };

  if (editorOpen) {
    return (
      <Card className="border bg-background p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Thank you page</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose the action after the submission</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" size="sm" onClick={saveEditor}>
              Save
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={cancelEditor}>
              Cancel
            </Button>
          </div>
        </div>
        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="ty-page-name">Name</Label>
            <Input
              id="ty-page-name"
              placeholder="Enter thank you page name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Page URL</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <div className="flex min-w-0 flex-1 rounded-md border border-input bg-muted/40">
                <span className="flex items-center border-r border-input px-2 text-[11px] text-muted-foreground sm:px-3 sm:text-xs">
                  {siteOrigin || '…'}
                  /apply/hiring/
                  {publishedSlugInput.trim() || 'your-form-slug'}
                  /thank-you/
                </span>
                <Input
                  className="min-w-[100px] border-0 bg-transparent text-xs shadow-none focus-visible:ring-0 sm:text-sm"
                  placeholder="page-URL"
                  spellCheck={false}
                  value={draft.slug}
                  onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="shrink-0 gap-1.5"
                disabled={!publishedSlugInput.trim() || !draft.slug.trim()}
                onClick={() => copyPageUrl(draft.slug)}
              >
                <Copy className="h-4 w-4" />
                Copy URL
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Publish the form and set the form slug first; this URL is the pattern your thank you page will use
              when a dedicated route is enabled.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label>Page content</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.alert('Templates will be available in a future update.')}
              >
                Choose Template
              </Button>
            </div>
            <RichTextEditor
              value={draft.bodyHtml}
              onChange={(html) => setDraft((d) => ({ ...d, bodyHtml: html }))}
              placeholder="Add content for your thank you page…"
              defaultFontSize="14px"
            />
            <p className="text-xs text-muted-foreground">
              Please select text before applying styling on it.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ty-page-tracking">Tracking code</Label>
            <Textarea
              id="ty-page-tracking"
              rows={5}
              placeholder="Enter your event tracking code"
              className="font-mono text-xs sm:text-sm"
              value={draft.trackingCode}
              onChange={(e) => setDraft((d) => ({ ...d, trackingCode: e.target.value }))}
            />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border bg-background p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Thank you page</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose the action after the submission</p>
        </div>
        <Button type="button" size="sm" className="shrink-0 gap-1.5" onClick={openNew}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      {pages.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center gap-4 py-6 text-center">
          <p className="max-w-sm text-sm text-muted-foreground">
            It seems you haven&apos;t added any thank you page yet.
          </p>
          <Button type="button" variant="outline" className="gap-2" onClick={openNew}>
            <Plus className="h-4 w-4" />
            + Add New
          </Button>
        </div>
      ) : (
        <div className="mt-6 rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[55%]">Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="align-middle font-medium text-foreground">
                    <span className="line-clamp-2 min-w-0">{rowTitle(row)}</span>
                  </TableCell>
                  <TableCell className="text-right align-middle">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="gap-1.5"
                        disabled={!publishedSlugInput.trim() || !row.slug.trim()}
                        onClick={() => copyPageUrl(row.slug)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy URL
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                        onClick={() => deleteRow(row.id)}
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
      )}
    </Card>
  );
}
