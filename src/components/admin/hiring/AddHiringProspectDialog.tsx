"use client";

import React, { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
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
    <div className="border border-input rounded-lg overflow-hidden bg-white dark:bg-transparent">
      <div className="border-b border-input bg-muted/40 px-3 py-1.5 flex items-center gap-1.5 flex-wrap">
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
        className="min-h-[140px] px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 prose prose-sm max-w-none dark:prose-invert [&:empty:before]:text-muted-foreground [&:empty:before]:content-[attr(data-placeholder)]"
        style={{ whiteSpace: "pre-wrap" }}
      />
      <div className="flex justify-end px-3 py-1 text-[11px] text-muted-foreground bg-slate-50 dark:bg-muted/30 border-t border-input">
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

  const wrappedTrigger =
    trigger && React.isValidElement(trigger)
      ? React.cloneElement(trigger as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
          onClick: (e: React.MouseEvent) => {
            (trigger as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>).props.onClick?.(e);
            onOpenChange(true);
          },
        })
      : trigger;

  return (
    <>
      {wrappedTrigger}
      <Modal
        isOpen={open}
        onClose={() => {
          if (!submitting) onOpenChange(false);
        }}
        title="Add prospect"
        panelClassName="max-w-3xl max-h-[90vh]"
      >
        <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-14rem)] pr-1">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-first-name`}>First name</Label>
              <Input
                id={`${formId}-first-name`}
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-last-name`}>Last name</Label>
              <Input
                id={`${formId}-last-name`}
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-email`}>Email</Label>
              <Input
                id={`${formId}-email`}
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
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label>Add a note</Label>
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
            <Label
              htmlFor={checkboxId}
              className="font-normal cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Do you want to add the prospect to the funnels?
            </Label>
          </div>
          {form.addToFunnel ? (
            <div className="space-y-2">
              <Label htmlFor={funnelSelectId}>Choose funnel(s)</Label>
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
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-cyan-500/20">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
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
        </div>
      </Modal>
    </>
  );
}
