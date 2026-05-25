"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneField } from "@/components/ui/phone-field";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  Underline,
} from "lucide-react";
import type { HiringProspect } from "@/hooks/useHiringProspects";
import {
  readHiringFunnelsFromLocalStorage,
  type HiringFunnelListItem,
} from "@/lib/hiring-funnel-local-storage";

export function ProspectNoteEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const exec = (command: string, arg?: string) => {
    if (typeof document === "undefined") return;
    document.execCommand(command, false, arg);
    editorRef.current?.focus();
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="border-b bg-muted/40 px-3 py-1.5 flex items-center gap-1.5 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Bold"
          onClick={() => exec("bold")}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Italic"
          onClick={() => exec("italic")}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Underline"
          onClick={() => exec("underline")}
        >
          <Underline className="h-4 w-4" />
        </Button>
        <span className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Align left"
          onClick={() => exec("justifyLeft")}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Align center"
          onClick={() => exec("justifyCenter")}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Align right"
          onClick={() => exec("justifyRight")}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <span className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Bullet list"
          onClick={() => exec("insertUnorderedList")}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title="Insert link"
          onClick={() => {
            const url = window.prompt("URL:");
            if (url) exec("createLink", url);
          }}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder="Add a note..."
        className="min-h-[140px] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 prose prose-sm max-w-none [&:empty:before]:text-muted-foreground [&:empty:before]:content-[attr(data-placeholder)]"
        style={{ whiteSpace: "pre-wrap" }}
      />
      <div className="flex justify-end px-3 py-1 text-[11px] text-muted-foreground bg-slate-50 border-t">
        {value
          ? `${value.replace(/<[^>]*>/g, "").trim().split(/\s+/).filter(Boolean).length} word(s)`
          : "0 word(s)"}
      </div>
    </div>
  );
}

export type AddHiringProspectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createProspect: (payload: Partial<HiringProspect>) => Promise<HiringProspect>;
  businessId: string | undefined;
  /** When opening from onboarding, pre-select this funnel if it exists in the saved list. */
  preferredFunnelId?: string | null;
  onError?: (message: string | null) => void;
  /** Optional trigger (e.g. Prospects tab button). Omit when opening programmatically only. */
  trigger?: ReactNode;
};

export function AddHiringProspectDialog({
  open,
  onOpenChange,
  createProspect,
  businessId,
  preferredFunnelId,
  onError,
  trigger,
}: AddHiringProspectDialogProps) {
  const formId = useId();
  const checkboxId = `${formId}-add-to-funnel`;
  const funnelSelectId = `${formId}-funnel`;

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    note: "",
    addToFunnel: true,
    funnelId: "",
  });
  const [funnelPickerList, setFunnelPickerList] = useState<HiringFunnelListItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !businessId) {
      if (!open) setSubmitting(false);
      return;
    }
    const list = readHiringFunnelsFromLocalStorage(businessId);
    setFunnelPickerList(list);
    const nextFunnel =
      preferredFunnelId != null &&
      preferredFunnelId !== "" &&
      list.some((f) => f.id === preferredFunnelId)
        ? preferredFunnelId
        : list[0]?.id ?? "";
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      note: "",
      addToFunnel: true,
      funnelId: nextFunnel,
    });
    onError?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when dialog opens / funnel context changes
  }, [open, businessId, preferredFunnelId]);

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.email.trim()) return;
    if (form.addToFunnel && !form.funnelId.trim()) return;

    const funnelPayload =
      form.addToFunnel && form.funnelId.trim() && form.funnelId.trim() !== "default"
        ? form.funnelId.trim()
        : null;

    setSubmitting(true);
    onError?.(null);
    try {
      await createProspect({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        role: "Prospect",
        source: "Manual",
        stage: "new",
        stepIndex: form.addToFunnel ? 0 : undefined,
        funnelId: funnelPayload,
        note: form.note || undefined,
      });
      onOpenChange(false);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Could not add prospect");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-3xl p-0 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b bg-slate-50 px-6 py-4">
          <DialogTitle className="text-xl font-semibold text-slate-900">Add prospect</DialogTitle>
        </div>
        <div className="px-6 py-4 space-y-6 overflow-y-auto min-h-0">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">First name</label>
              <Input
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Last name</label>
              <Input
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <PhoneField
              label="Phone number"
              placeholder="Phone number"
              value={form.phone}
              onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
              labelClassName="text-sm font-medium text-slate-700"
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Add a note</label>
            <ProspectNoteEditor
              value={form.note}
              onChange={(value) => setForm((p) => ({ ...p, note: value }))}
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id={checkboxId}
              checked={form.addToFunnel}
              disabled={submitting}
              onCheckedChange={(v) => {
                const on = !!v;
                setForm((p) => {
                  if (!on) return { ...p, addToFunnel: false };
                  if (p.funnelId) return { ...p, addToFunnel: true };
                  const list =
                    typeof window !== "undefined" && businessId
                      ? readHiringFunnelsFromLocalStorage(businessId)
                      : funnelPickerList;
                  return { ...p, addToFunnel: true, funnelId: list[0]?.id ?? "" };
                });
              }}
            />
            <label
              htmlFor={checkboxId}
              className="text-sm text-slate-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Do you want to add the prospect to the funnels?
            </label>
          </div>
          {form.addToFunnel ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor={funnelSelectId}>
                Choose funnel(s)
              </label>
              <Select
                value={form.funnelId || undefined}
                onValueChange={(value) => setForm((p) => ({ ...p, funnelId: value }))}
                disabled={submitting}
              >
                <SelectTrigger id={funnelSelectId} className="w-full">
                  <SelectValue placeholder="Select funnel" />
                </SelectTrigger>
                <SelectContent>
                  {funnelPickerList.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <DialogFooter className="border-t bg-slate-50 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={
              submitting ||
              !form.firstName.trim() ||
              !form.email.trim() ||
              (form.addToFunnel && !form.funnelId.trim())
            }
          >
            {submitting ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
