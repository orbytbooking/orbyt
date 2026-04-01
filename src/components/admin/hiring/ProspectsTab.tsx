"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useHiringProspects, type HiringProspect, type HiringStage } from "@/hooks/useHiringProspects";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  UserPlus,
  Plus,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Link as LinkIcon,
  ChevronDown,
  Search,
} from "lucide-react";

type Applicant = HiringProspect;

const statusFromStage = (stage: HiringStage) => {
  if (stage === "rejected") return "Rejected";
  if (stage === "interview") return "Interview";
  if (stage === "hired") return "Onboarded";
  // new/screening are treated as "Active" prospects in the UI
  return "Active";
};

const statusBadgeClass = (stage: HiringStage) => {
  if (stage === "rejected") return "bg-rose-100 text-rose-700";
  if (stage === "interview") return "bg-indigo-100 text-indigo-700";
  if (stage === "hired") return "bg-emerald-100 text-emerald-700";
  // Active (new/screening) - match screenshot pill look
  return "bg-emerald-100 text-emerald-700";
};

const formatSubmittedAt = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const parseUserDate = (input: string): Date | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Accept MM/DD/YYYY
  const mmddyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const m = trimmed.match(mmddyyyy);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    const year = Number(m[3]);
    const d = new Date(year, month - 1, day);
    // Validate roundtrip
    if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) return d;
    return null;
  }

  // Accept yyyy-mm-dd
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
  const isoMatch = trimmed.match(iso);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) return d;
    return null;
  }

  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
};

function ProspectNoteEditor({
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
        {/* Simple word counter */}
        {value
          ? `${value.replace(/<[^>]*>/g, "").trim().split(/\s+/).filter(Boolean).length} word(s)`
          : "0 word(s)"}
      </div>
    </div>
  );
}

export default function ProspectsTab() {
  const { prospects, loading, createProspect, updateProspect, deleteProspect } = useHiringProspects();
  const [addOpen, setAddOpen] = useState(false);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Applicant | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    note: "",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formsFilter, setFormsFilter] = useState<string>("all");
  const [prospectsStatusFilter, setProspectsStatusFilter] = useState<string>("prospects");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [prospectsTypeFilter, setProspectsTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    note: "",
    addToFunnel: true,
  });

  const setApplicantStage = async (applicantId: string, nextStage: HiringStage) => {
    const nextStepIndex = nextStage === "new" ? 0 : nextStage === "screening" ? 1 : undefined;
    const updated = await updateProspect(applicantId, {
      stage: nextStage,
      ...(typeof nextStepIndex === "number" ? { stepIndex: nextStepIndex } : {}),
    });
    setSelectedProspect((prev) => (prev?.id === applicantId ? updated : prev));
  };

  const hasSelection = selectedIds.length > 0;

  const filteredProspects = useMemo(() => {
    return prospects.filter((a) => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const haystack = `${a.name} ${a.email} ${a.phone ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (formsFilter !== "all") {
        // We currently only know "Manual" vs "Non-manual" because source isn't fully wired.
        if (formsFilter === "manual" && a.source !== "Manual") return false;
      }

    if (prospectsStatusFilter === "prospects") {
      if (a.stage !== "new" && a.stage !== "screening") return false;
    } else if (prospectsStatusFilter === "rejected") {
      if (a.stage !== "rejected") return false;
    } else if (prospectsStatusFilter === "onboarded") {
      if (a.stage !== "hired") return false;
    }

      if (prospectsTypeFilter !== "all") {
        if (prospectsTypeFilter === "manual" && a.source !== "Manual") return false;
        if (prospectsTypeFilter === "form" && a.source === "Manual") return false;
      }

      const parsed = parseUserDate(dateFilter);
      if (parsed) {
        const d = new Date(a.createdAt);
        if (d.getFullYear() !== parsed.getFullYear()) return false;
        if (d.getMonth() !== parsed.getMonth()) return false;
        if (d.getDate() !== parsed.getDate()) return false;
      }

      return true;
    });
  }, [prospects, formsFilter, prospectsStatusFilter, dateFilter, prospectsTypeFilter, searchQuery]);

  const activityItems = useMemo(() => {
    if (!selectedProspect) return [];
    const name = selectedProspect.name;
    const status = statusFromStage(selectedProspect.stage);

    // Demo timeline items. When backend is ready, replace with real events.
    const base = new Date(selectedProspect.createdAt);
    const toDateKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const toDateLabel = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "numeric" });

    const d0 = base;
    const d1 = new Date(d0.getTime());
    d1.setDate(d1.getDate() - 1);
    const d2 = new Date(d0.getTime());
    d2.setDate(d2.getDate() - 3);

    return [
      { dateKey: toDateKey(d2), dateLabel: toDateLabel(d2), time: "10:12 am", text: `new prospect invited to apply` },
      { dateKey: toDateKey(d2), dateLabel: toDateLabel(d2), time: "10:20 am", text: `application form sent to the prospect` },
      { dateKey: toDateKey(d1), dateLabel: toDateLabel(d1), time: "09:05 am", text: `prospect reviewed by admin` },
      { dateKey: toDateKey(d0), dateLabel: toDateLabel(d0), time: "02:57 am", text: `new prospect added by ${name}` },
      { dateKey: toDateKey(d0), dateLabel: toDateLabel(d0), time: "02:58 am", text: `Status updated to ${status}` },
      { dateKey: toDateKey(d0), dateLabel: toDateLabel(d0), time: "03:02 am", text: `Prospect note recorded` },
      { dateKey: toDateKey(d0), dateLabel: toDateLabel(d0), time: "03:06 am", text: `Actions prepared for review` },
    ];
  }, [selectedProspect?.id, selectedProspect?.name, selectedProspect?.stage, selectedProspect?.createdAt]);

  useEffect(() => {
    // Keep selection in sync when filtering changes what rows are shown.
    const visibleIds = new Set(filteredProspects.map((p) => p.id));
    setSelectedIds((prev) => {
      if (prev.length === 0) return prev;
      // Avoid re-setting state with a new array reference if selection didn't actually change.
      if (prev.every((id) => visibleIds.has(id))) return prev;
      return prev.filter((id) => visibleIds.has(id));
    });
  }, [filteredProspects]);

  const bulkUpdateStage = async (nextStage: HiringStage) => {
    if (!hasSelection) return;
    await Promise.all(
      selectedIds.map((id) =>
        updateProspect(id, {
          stage: nextStage,
          ...(nextStage === "new" ? { stepIndex: 0 } : nextStage === "screening" ? { stepIndex: 1 } : {}),
        })
      )
    );
    setSelectedIds([]);
  };

  const bulkDelete = async () => {
    if (!hasSelection) return;
    await Promise.all(selectedIds.map((id) => deleteProspect(id)));
    setSelectedIds([]);
  };

  const deleteApplicantById = async (applicantId: string) => {
    await deleteProspect(applicantId);
    setSelectedIds((prev) => prev.filter((id) => id !== applicantId));
    setViewOpen(false);
    setSelectedProspect(null);
  };

  const updateApplicantImageById = async (applicantId: string, dataUrl: string) => {
    const updated = await updateProspect(applicantId, { image: dataUrl });
    setSelectedProspect((prev) => (prev?.id === applicantId ? updated : prev));
  };

  const updateApplicantById = async (applicantId: string, updates: Partial<Applicant>) => {
    const updated = await updateProspect(applicantId, updates);
    setSelectedProspect((prev) => (prev?.id === applicantId ? updated : prev));
  };

  const openEditModal = () => {
    if (!selectedProspect) return;
    setEditForm({
      // Prefer explicitly stored first/last name fields.
      firstName: selectedProspect.firstName ?? selectedProspect.name,
      lastName: selectedProspect.lastName ?? "",
      email: selectedProspect.email,
      phone: selectedProspect.phone ?? "",
      note: selectedProspect.note ?? "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedProspect) return;
    const first = editForm.firstName.trim();
    const last = editForm.lastName.trim();
    const email = editForm.email.trim();
    if (!first || !email) return;

    const nextName = `${first}${last ? ` ${last}` : ""}`;
    await updateApplicantById(selectedProspect.id, {
      firstName: first,
      lastName: last,
      name: nextName,
      email,
      phone: editForm.phone.trim() || undefined,
      note: editForm.note || undefined,
    });
    setEditOpen(false);
  };

  const handleAddProspect = async () => {
    if (!form.firstName.trim() || !form.email.trim()) return;
    await createProspect({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || undefined,
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      role: "Prospect",
      source: "Manual",
      stage: "new",
      stepIndex: form.addToFunnel ? 0 : undefined,
      note: form.note || undefined,
    });

    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      note: "",
      addToFunnel: true,
    });
    setAddOpen(false);
  };

  const router = useRouter();

  const handleCreateForm = () => {
    const name = newFormName.trim() || "Untitled form";
    setCreateFormOpen(false);
    setNewFormName("");
    router.push(`/admin/hiring/forms/builder?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className="space-y-4">
      {/* Filters row (UI only; wired to table for search/type/date) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6 md:items-end">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Forms</div>
          <Select value={formsFilter} onValueChange={setFormsFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Forms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Forms</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Prospects status</div>
          <Select value={prospectsStatusFilter} onValueChange={setProspectsStatusFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Prospects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prospects">Prospects</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="onboarded">Onboarded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Date</div>
          <Input
            value={dateFilter}
            placeholder="MM/DD/YYYY"
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Prospects type</div>
          <Select value={prospectsTypeFilter} onValueChange={setProspectsTypeFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Prospects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prospects</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="form">Form</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 md:col-span-2">
          <div className="text-xs text-muted-foreground">Search</div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="pr-9"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Prospects</CardTitle>
            <CardDescription>
              This section displays all prospects submitted by applicants.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap justify-end">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-sky-200 bg-white text-sky-700 hover:bg-sky-50 hover:text-sky-800 hover:border-sky-300"
              >
                <UserPlus className="h-4 w-4" />
                Add Prospect
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0">
              <div className="border-b bg-slate-50 px-6 py-4">
                <DialogTitle className="text-xl font-semibold text-slate-900">Add prospect</DialogTitle>
              </div>
              <div className="px-6 py-4 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">First name</label>
                    <Input
                      placeholder="First name"
                      value={form.firstName}
                      onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Last name</label>
                    <Input
                      placeholder="Last name"
                      value={form.lastName}
                      onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <Input
                      type="email"
                      placeholder="Email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <PhoneField
                    label="Phone number"
                    placeholder="Phone number"
                    value={form.phone}
                    onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
                    labelClassName="text-sm font-medium text-slate-700"
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
                    id="add-to-funnel"
                    checked={form.addToFunnel}
                    onCheckedChange={(v) => setForm((p) => ({ ...p, addToFunnel: !!v }))}
                  />
                  <label
                    htmlFor="add-to-funnel"
                    className="text-sm text-slate-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Do you want to add the prospect to the funnels?
                  </label>
                </div>
              </div>
              <DialogFooter className="border-t bg-slate-50 px-6 py-4">
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddProspect}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={createFormOpen} onOpenChange={setCreateFormOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 text-white hover:bg-teal-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                  <Plus className="h-3.5 w-3.5" />
                </span>
                Create New Form
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create form</DialogTitle>
                <DialogDescription>Give your form a name to get started.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Form name</label>
                <Input
                  placeholder="Enter form name"
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateFormOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateForm} disabled={!newFormName.trim()}>
                  Next
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {hasSelection && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
                  Actions
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => bulkUpdateStage("hired")}>Onboard</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => bulkUpdateStage("rejected")}>Reject</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600 focus:text-red-600" onSelect={bulkDelete}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={
                        filteredProspects.length > 0 && filteredProspects.every((p) => selectedIds.includes(p.id))
                      }
                      onCheckedChange={(v) => {
                        const next = !!v;
                        setSelectedIds(next ? filteredProspects.map((p) => p.id) : []);
                      }}
                      aria-label="Select all prospects"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Onboarding</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Date submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && filteredProspects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                      No prospects match your filters.
                    </TableCell>
                  </TableRow>
                )}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                      Loading prospects...
                    </TableCell>
                  </TableRow>
                )}
                {filteredProspects.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(a.id)}
                        onCheckedChange={(v) => {
                          const shouldSelect = !!v;
                          setSelectedIds((prev) =>
                            shouldSelect ? Array.from(new Set([...prev, a.id])) : prev.filter((id) => id !== a.id),
                          );
                        }}
                        aria-label={`Select ${a.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{a.name}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClass(a.stage)} variant="outline">
                        {statusFromStage(a.stage)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={a.stage === "hired"}
                        onCheckedChange={() => {
                          // Read-only: prevent changing stage when user clicks.
                        }}
                        aria-label={`Onboarding for ${a.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.source === "Manual" ? "—" : a.source}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatSubmittedAt(a.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 px-2 text-muted-foreground">
                            Options
                            <ChevronDown className="ml-1 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              setSelectedProspect(a);
                              setViewOpen(true);
                            }}
                          >
                            View Prospect
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={a.stage !== "new"}
                            onSelect={() => setApplicantStage(a.id, "interview")}
                          >
                            Create Member
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={a.stage === "hired"}
                            onSelect={() => setApplicantStage(a.id, "hired")}
                          >
                            Onboarded
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={a.stage === "interview"}
                            onSelect={() => setApplicantStage(a.id, "interview")}
                          >
                            Request
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onSelect={() => setApplicantStage(a.id, "rejected")}
                          >
                            Reject
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-6xl p-0 rounded-xl overflow-hidden">
          <div className="bg-white">
            <div className="border-b px-6 py-4 flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-base sm:text-lg">Prospect Details</DialogTitle>
                <div className="text-sm text-muted-foreground mt-1">This section displays all the details of prospect.</div>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="text-sm text-muted-foreground"
                onClick={() => {
                  setViewOpen(false);
                  setSelectedProspect(null);
                }}
              >
                <span className="mr-2">←</span>Back To List
              </Button>
            </div>

            {selectedProspect ? (
              <div className="p-6">
                {/* Top summary */}
                <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_260px] gap-6 lg:grid-rows-[auto_auto] items-stretch">
                  {/* Left profile */}
                  <div className="border rounded-lg p-4 lg:row-start-1">
                    <div className="flex flex-col items-center gap-3">
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="Upload avatar"
                        title="Upload avatar"
                        className="w-24 h-24 rounded-full bg-muted flex items-center justify-center cursor-pointer"
                        onClick={() => imageInputRef.current?.click()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") imageInputRef.current?.click();
                        }}
                      >
                        {selectedProspect.image ? (
                          // Avatar image
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selectedProspect.image}
                            alt={`${selectedProspect.name} avatar`}
                            className="w-24 h-24 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-background border" />
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground text-center">
                        Image should not be more than 300px by 300px.
                      </div>
                    </div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !selectedProspect) return;

                        // Basic guard: keep images reasonably sized for uploads.
                        if (file.size > 1_500_000) {
                          alert("Image is too large. Please choose an image under ~1.5MB.");
                          e.target.value = "";
                          return;
                        }

                        const reader = new FileReader();
                        reader.onload = async () => {
                          const dataUrl = typeof reader.result === "string" ? reader.result : "";
                          if (!dataUrl) return;
                          await updateApplicantImageById(selectedProspect.id, dataUrl);
                        };
                        reader.readAsDataURL(file);
                        // Reset input so the same file can be selected again.
                        e.target.value = "";
                      }}
                    />
                  </div>

                  {/* Center details */}
                  <div className="border rounded-lg p-4 lg:row-start-1 lg:col-start-2">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold flex items-center gap-2">
                            {selectedProspect.name}
                            <Badge className="shrink-0" variant="outline">
                              {statusFromStage(selectedProspect.stage)}
                            </Badge>
                          </div>
                          <Button variant="outline" className="bg-white" onClick={openEditModal}>
                            Edit
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Email</div>
                            <div className="text-sm text-slate-900/80 truncate">{selectedProspect.email}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">Phone number</div>
                            <div className="text-sm text-slate-900/80">{selectedProspect.phone || "—"}</div>
                          </div>
                        </div>
                      </div>

                      <div className="border-l-4 pl-3 py-2 bg-muted/20 rounded-md">
                        <div className="text-xs text-muted-foreground">Note</div>
                        <div
                          className="text-sm"
                          // Note editor stores HTML; keep rendering minimal for safety.
                          // eslint-disable-next-line react/no-danger
                          dangerouslySetInnerHTML={{ __html: selectedProspect.note ? selectedProspect.note : "—" }}
                        />
                      </div>

                      <div className="flex flex-wrap gap-3 pt-1">
                        <Button variant="outline" className="bg-white">
                          Combine profile
                        </Button>
                        <Button
                          variant="secondary"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => {
                            setApplicantStage(selectedProspect.id, "hired");
                            setViewOpen(false);
                            setSelectedProspect(null);
                          }}
                        >
                          Mark As Onboarded
                        </Button>
                        <Button
                          variant="destructive"
                          className="bg-rose-600 hover:bg-rose-700"
                          onClick={() => {
                            setApplicantStage(selectedProspect.id, "rejected");
                            setViewOpen(false);
                            setSelectedProspect(null);
                          }}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="outline"
                          className="border-red-200 text-red-600 hover:text-red-700"
                          onClick={() => deleteApplicantById(selectedProspect.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Right sidebar actions (top row) */}
                  <div className="border rounded-lg p-4 lg:row-start-1 lg:col-start-3">
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => {
                          setApplicantStage(selectedProspect.id, "new");
                          setViewOpen(false);
                          setSelectedProspect(null);
                        }}
                      >
                        Add To Funnel
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => {
                          setApplicantStage(selectedProspect.id, "interview");
                          setViewOpen(false);
                          setSelectedProspect(null);
                        }}
                      >
                        Schedule interview
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-full mt-2 bg-rose-50 hover:bg-rose-100 text-rose-700"
                        onClick={() => {
                          setApplicantStage(selectedProspect.id, "interview");
                          setViewOpen(false);
                          setSelectedProspect(null);
                        }}
                      >
                        Create Members
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => {
                          // Placeholder: files are not implemented in this UI yet.
                        }}
                      >
                        View Files
                      </Button>
                  </div>

                  {/* Right sidebar actions (bottom row) */}
                  <div className="border rounded-lg p-4 lg:row-start-2 lg:col-start-3">
                    <div className="text-sm font-medium">Send Message</div>
                    <Select defaultValue="all">
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Send Message" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="text-sm font-medium mt-4">Send Form</div>
                    <Select defaultValue="all">
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Send Form" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Activities (bottom row, spans left+center) */}
                  <div className="border rounded-lg p-4 lg:row-start-2 lg:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold">Activities</div>
                        <div className="text-sm text-muted-foreground"> </div>
                      </div>
                      <Select defaultValue="all">
                        <SelectTrigger className="w-28">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="mt-4">
                      <div className="mt-3 max-h-[175px] overflow-y-scroll pr-2 [scrollbar-gutter:stable] space-y-3">
                        {activityItems.map((it, idx) => {
                          const prev = activityItems[idx - 1];
                          const showDateHeader = !prev || prev.dateKey !== it.dateKey;
                          return (
                            <div key={it.dateKey + it.time + it.text} className="space-y-1">
                              {showDateHeader && (
                                <div className="text-sm text-muted-foreground">{it.dateLabel}</div>
                              )}
                              <div className="flex items-start gap-3">
                                <div className="mt-1 w-2 h-2 rounded-full bg-primary" />
                                <div className="space-y-1">
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">{it.time}</span> - {it.text}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-muted-foreground">Select a prospect to view details.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-5xl p-0 rounded-xl overflow-hidden">
          <div className="bg-white">
            <div className="border-b px-6 py-4">
              <DialogTitle className="text-3xl font-semibold text-slate-900">Update prospect</DialogTitle>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">First name</label>
                  <Input
                    value={editForm.firstName}
                    onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Last name</label>
                  <Input
                    value={editForm.lastName}
                    onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <PhoneField
                  label="Phone number"
                  value={editForm.phone}
                  onChange={(v) => setEditForm((p) => ({ ...p, phone: v }))}
                  labelClassName="text-sm font-medium text-slate-700"
                />
              </div>

              <div className="space-y-2">
                <ProspectNoteEditor
                  value={editForm.note}
                  onChange={(value) => setEditForm((p) => ({ ...p, note: value }))}
                />
              </div>
            </div>
            <DialogFooter className="border-t bg-slate-50 px-6 py-4">
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSaveEdit}
                disabled={!editForm.firstName.trim() || !editForm.email.trim()}
              >
                Update
              </Button>
              <Button variant="destructive" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
