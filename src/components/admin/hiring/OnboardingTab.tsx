import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  StickyNote,
  Table2,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { useHiringProspects, type HiringProspect, type HiringStage } from "@/hooks/useHiringProspects";
import { hiringFunnelsStorageKey } from "@/lib/hiring-funnel-local-storage";
import {
  allFunnelStatusLabelOptions,
  appendCustomFunnelStatusLabel,
  DEFAULT_FUNNEL_STATUS_LABELS,
} from "@/lib/hiring-funnel-status-labels";
import { AddHiringProspectDialog } from "@/components/admin/hiring/AddHiringProspectDialog";

const COLUMNS_KEY_PREFIX = "hiringFunnelColumns";
const ACTIVE_FUNNEL_KEY_PREFIX = "hiringActiveFunnel";

type PipelineColumn = {
  id: string;
  name: string;
};

type FunnelMeta = {
  id: string;
  name: string;
};

const DEFAULT_FUNNEL_COLUMNS: PipelineColumn[] = [
  { id: "prospects", name: "Prospects" },
  { id: "pre-hiring-form", name: "Pre‑Hiring Form" },
  { id: "first-interview", name: "First Interview" },
  { id: "final-policy", name: "Final Policy Quiz" },
  { id: "ids-collected", name: "IDs collected" },
  { id: "tax-forms", name: "Tax Forms" },
];

const stageLabel: Record<HiringStage, string> = {
  new: "New",
  screening: "Screening",
  interview: "Interview",
  hired: "Hired",
  rejected: "Rejected",
};

const STATUS_NONE_VALUE = "__none__";

function completionForProspect(p: HiringProspect, cols: PipelineColumn[]): number {
  if (cols.length === 0) return 0;
  const st = p.funnelStepStatuses ?? {};
  const done = cols.filter((c) => (st[c.id]?.status ?? "").toLowerCase() === "done").length;
  return Math.round((done / cols.length) * 100);
}

function statusSelectOptions(labels: string[], current: string | undefined): string[] {
  const out = [...labels];
  if (current && !out.some((x) => x === current)) out.unshift(current);
  return out;
}

function prospectBelongsToActiveFunnel(p: HiringProspect, activeFunnelId: string | null): boolean {
  const active = activeFunnelId ?? "default";
  const fid = p.funnelId ?? null;
  if (active === "default") return fid == null || fid === "" || fid === "default";
  return fid === active;
}

/** First “pool” column: no column-level status UI; show prospect names instead (matches default `prospects` id). */
function isProspectsPoolColumn(col: PipelineColumn): boolean {
  if (col.id === "prospects") return true;
  const n = (col.name || "").trim().toLowerCase();
  return n === "prospects";
}

function parseUserDate(input: string): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const mmddyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const m = trimmed.match(mmddyyyy);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    const year = Number(m[3]);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) return d;
    return null;
  }
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
}

export default function OnboardingTab() {
  const { currentBusiness } = useBusiness();
  const {
    prospects,
    loading,
    error,
    refetch,
    createProspect,
    updateProspect,
  } = useHiringProspects();

  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [funnels, setFunnels] = useState<FunnelMeta[]>([]);
  const [activeFunnelId, setActiveFunnelId] = useState<string | null>(null);
  const [addFunnelOpen, setAddFunnelOpen] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState("");
  const [newFunnelColumns, setNewFunnelColumns] = useState<PipelineColumn[]>(DEFAULT_FUNNEL_COLUMNS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editFunnelOpen, setEditFunnelOpen] = useState(false);
  const [editingFunnelId, setEditingFunnelId] = useState<string | null>(null);
  const [editFunnelName, setEditFunnelName] = useState("");
  const [editFunnelColumns, setEditFunnelColumns] = useState<PipelineColumn[]>([]);
  const [addProspectOpen, setAddProspectOpen] = useState(false);
  const [onboardingSearchQuery, setOnboardingSearchQuery] = useState("");
  const [onboardingDateFilter, setOnboardingDateFilter] = useState("");
  const [onboardingDatePickerOpen, setOnboardingDatePickerOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"board" | "table">("board");
  const [statusLabels, setStatusLabels] = useState<string[]>(() => [...DEFAULT_FUNNEL_STATUS_LABELS]);
  const [statusCellBusy, setStatusCellBusy] = useState<Set<string>>(() => new Set());
  const [addStatusOpen, setAddStatusOpen] = useState(false);
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const [stepNoteOpen, setStepNoteOpen] = useState(false);
  const [stepNoteContext, setStepNoteContext] = useState<{ prospectId: string; columnId: string } | null>(
    null,
  );
  const [stepNoteDraft, setStepNoteDraft] = useState("");

  const funnelsStorageKey = currentBusiness?.id ? hiringFunnelsStorageKey(currentBusiness.id) : null;
  const activeFunnelStorageKey = currentBusiness?.id ? `${ACTIVE_FUNNEL_KEY_PREFIX}:${currentBusiness.id}` : null;
  const getColumnsStorageKey = (funnelId: string | null) =>
    currentBusiness?.id && funnelId
      ? `${COLUMNS_KEY_PREFIX}:${currentBusiness.id}:${funnelId}`
      : null;
  const columnsStorageKey = getColumnsStorageKey(activeFunnelId);
  const activeFunnel = funnels.find((f) => f.id === activeFunnelId) ?? null;

  const onboardingFilterDate = useMemo(
    () => parseUserDate(onboardingDateFilter.trim()),
    [onboardingDateFilter],
  );

  const loadColumnsForFunnel = (funnelId: string): PipelineColumn[] => {
    const key = getColumnsStorageKey(funnelId);
    if (!key || typeof window === "undefined") return DEFAULT_FUNNEL_COLUMNS;
    try {
      const storedCols = JSON.parse(localStorage.getItem(key) || "null");
      if (Array.isArray(storedCols) && storedCols.length > 0) return storedCols;
    } catch {
      // fall through to default
    }
    return DEFAULT_FUNNEL_COLUMNS;
  };

  const saveColumnsForFunnel = (funnelId: string, cols: PipelineColumn[]) => {
    const key = getColumnsStorageKey(funnelId);
    if (!key || typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(cols));
  };

  useEffect(() => {
    if (typeof window === "undefined" || !funnelsStorageKey || !activeFunnelStorageKey) return;
    try {
      const storedFunnels = JSON.parse(localStorage.getItem(funnelsStorageKey) || "null");
      const initialFunnels: FunnelMeta[] = Array.isArray(storedFunnels) && storedFunnels.length > 0
        ? storedFunnels
        : [{ id: "default", name: "Onboarding funnel" }];
      setFunnels(initialFunnels);
      localStorage.setItem(funnelsStorageKey, JSON.stringify(initialFunnels));

      const storedActive = localStorage.getItem(activeFunnelStorageKey);
      const nextActive = initialFunnels.some((f) => f.id === storedActive)
        ? storedActive
        : initialFunnels[0]?.id ?? null;
      setActiveFunnelId(nextActive);
      if (nextActive) localStorage.setItem(activeFunnelStorageKey, nextActive);
    } catch {
      const fallback = [{ id: "default", name: "Onboarding funnel" }];
      setFunnels(fallback);
      setActiveFunnelId(fallback[0].id);
    }
  }, [funnelsStorageKey, activeFunnelStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !funnelsStorageKey || !activeFunnelStorageKey) return;
    if (funnels.length > 0) {
      localStorage.setItem(funnelsStorageKey, JSON.stringify(funnels));
      if (activeFunnelId) localStorage.setItem(activeFunnelStorageKey, activeFunnelId);
    }
  }, [funnels, activeFunnelId, funnelsStorageKey, activeFunnelStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !currentBusiness?.id || !activeFunnelId) return;
    setStatusLabels(allFunnelStatusLabelOptions(currentBusiness.id, activeFunnelId));
  }, [currentBusiness?.id, activeFunnelId]);

  // Load funnel columns (browser only; one layout per business)
  useEffect(() => {
    if (typeof window === "undefined" || !columnsStorageKey) return;
    try {
      const legacy = localStorage.getItem(COLUMNS_KEY_PREFIX);
      const storedCols = JSON.parse(localStorage.getItem(columnsStorageKey) || "null");
      if (Array.isArray(storedCols) && storedCols.length > 0) {
        setColumns(storedCols);
      } else if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setColumns(parsed);
          localStorage.setItem(columnsStorageKey, JSON.stringify(parsed));
        } else {
          setColumns(DEFAULT_FUNNEL_COLUMNS);
          localStorage.setItem(columnsStorageKey, JSON.stringify(DEFAULT_FUNNEL_COLUMNS));
        }
      } else {
        setColumns(DEFAULT_FUNNEL_COLUMNS);
        localStorage.setItem(columnsStorageKey, JSON.stringify(DEFAULT_FUNNEL_COLUMNS));
      }
    } catch {
      setColumns(DEFAULT_FUNNEL_COLUMNS);
    }
  }, [columnsStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !columnsStorageKey) return;
    if (columns.length > 0) {
      localStorage.setItem(columnsStorageKey, JSON.stringify(columns));
    }
  }, [columns, columnsStorageKey]);

  const patchStepCell = async (
    prospectId: string,
    columnId: string,
    patch: { status?: string | null; note?: string | null },
  ) => {
    const p = prospects.find((x) => x.id === prospectId);
    if (!p) return;
    const busyKey = `${prospectId}:${columnId}`;
    setStatusCellBusy((prev) => new Set(prev).add(busyKey));
    setActionError(null);
    try {
      await updateProspect(prospectId, {
        funnelStepStatuses: { [columnId]: patch },
      });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not update step status");
      void refetch();
    } finally {
      setStatusCellBusy((prev) => {
        const n = new Set(prev);
        n.delete(busyKey);
        return n;
      });
    }
  };

  const openStepNote = (prospectId: string, columnId: string) => {
    const p = prospects.find((x) => x.id === prospectId);
    const raw = p?.funnelStepStatuses?.[columnId]?.note ?? "";
    setStepNoteContext({ prospectId, columnId });
    setStepNoteDraft(typeof raw === "string" ? raw : "");
    setStepNoteOpen(true);
  };

  const saveStepNote = async () => {
    if (!stepNoteContext) return;
    await patchStepCell(stepNoteContext.prospectId, stepNoteContext.columnId, {
      note: stepNoteDraft.trim() ? stepNoteDraft : null,
    });
    setStepNoteOpen(false);
    setStepNoteContext(null);
    setStepNoteDraft("");
  };

  const handleAppendCustomStatus = () => {
    const t = newStatusLabel.trim();
    if (!t || !currentBusiness?.id || !activeFunnelId) return;
    appendCustomFunnelStatusLabel(currentBusiness.id, activeFunnelId, t);
    setStatusLabels(allFunnelStatusLabelOptions(currentBusiness.id, activeFunnelId));
    setNewStatusLabel("");
    setAddStatusOpen(false);
  };

  const handleColumnNameChange = (id: string, name: string) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const handleAddColumn = () => {
    const next: PipelineColumn = {
      id: `col-${Date.now()}`,
      name: "New step",
    };
    setColumns((prev) => [...prev, next]);
  };

  const handleAddFunnel = () => {
    const name = newFunnelName.trim();
    if (!name) return;
    if (!currentBusiness?.id) return;
    const preparedCols = newFunnelColumns
      .map((c) => ({ ...c, name: c.name.trim() || "New step" }))
      .filter((c) => c.name.trim().length > 0);
    const colsToSave = preparedCols.length > 0 ? preparedCols : DEFAULT_FUNNEL_COLUMNS;
    const next: FunnelMeta = {
      id: `funnel-${Date.now()}`,
      name,
    };
    setFunnels((prev) => [...prev, next]);
    saveColumnsForFunnel(next.id, colsToSave);
    setActiveFunnelId(next.id);
    setColumns(colsToSave);
    setNewFunnelName("");
    setNewFunnelColumns(DEFAULT_FUNNEL_COLUMNS);
    setAddFunnelOpen(false);
  };

  const handleAddColumnToNewFunnel = () => {
    const next: PipelineColumn = {
      id: `new-col-${Date.now()}`,
      name: "New step",
    };
    setNewFunnelColumns((prev) => [...prev, next]);
  };

  const handleNewFunnelColumnNameChange = (id: string, name: string) => {
    setNewFunnelColumns((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const moveNewFunnelColumn = (id: string, dir: -1 | 1) => {
    setNewFunnelColumns((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(j, 0, item);
      return copy;
    });
  };

  const deleteNewFunnelColumn = (id: string) => {
    setNewFunnelColumns((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx <= 0 || prev.length <= 1) return prev;
      return prev.filter((c) => c.id !== id);
    });
  };

  const handleFunnelNameChange = (id: string, name: string) => {
    setFunnels((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  };

  const deleteFunnel = (id: string) => {
    if (funnels.length <= 1) return;
    const nextFunnels = funnels.filter((f) => f.id !== id);
    setFunnels(nextFunnels);
    if (activeFunnelId === id) {
      setActiveFunnelId(nextFunnels[0]?.id ?? null);
    }
  };

  const openEditFunnel = (funnelId: string) => {
    const target = funnels.find((f) => f.id === funnelId);
    if (!target) return;
    const loadedCols = loadColumnsForFunnel(funnelId);
    setEditingFunnelId(funnelId);
    setEditFunnelName(target.name);
    setEditFunnelColumns(loadedCols);
    setEditFunnelOpen(true);
  };

  const handleSaveEditFunnel = () => {
    if (!editingFunnelId) return;
    const trimmedName = editFunnelName.trim();
    if (!trimmedName) return;
    const normalizedCols = editFunnelColumns
      .map((c) => ({ ...c, name: c.name.trim() || "New step" }))
      .filter((c) => c.name.trim().length > 0);
    const colsToSave = normalizedCols.length > 0 ? normalizedCols : DEFAULT_FUNNEL_COLUMNS;

    setFunnels((prev) =>
      prev.map((f) => (f.id === editingFunnelId ? { ...f, name: trimmedName } : f)),
    );
    saveColumnsForFunnel(editingFunnelId, colsToSave);
    if (activeFunnelId === editingFunnelId) {
      setColumns(colsToSave);
    }
    setEditFunnelOpen(false);
  };

  const handleAddColumnToEditingFunnel = () => {
    const next: PipelineColumn = {
      id: `edit-col-${Date.now()}`,
      name: "New step",
    };
    setEditFunnelColumns((prev) => [...prev, next]);
  };

  const handleEditingFunnelColumnNameChange = (id: string, name: string) => {
    setEditFunnelColumns((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const moveEditingFunnelColumn = (id: string, dir: -1 | 1) => {
    setEditFunnelColumns((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(j, 0, item);
      return copy;
    });
  };

  const deleteEditingFunnelColumn = (id: string) => {
    setEditFunnelColumns((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx <= 0 || prev.length <= 1) return prev;
      return prev.filter((c) => c.id !== id);
    });
  };

  const moveColumn = (id: string, dir: -1 | 1) => {
    setColumns((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(j, 0, item);
      return copy;
    });
  };

  const deleteColumn = (id: string) => {
    const idx = columns.findIndex((c) => c.id === id);
    if (columns.length <= 1 || idx < 0) return;

    setColumns((prev) => prev.filter((c) => c.id !== id));

    const updates = prospects
      .filter((p) => prospectBelongsToActiveFunnel(p, activeFunnelId))
      .map((p) => {
        const si = p.stepIndex ?? 0;
        let newStep = si;
        if (si === idx) newStep = Math.max(0, idx - 1);
        else if (si > idx) newStep = si - 1;
        return { id: p.id, newStep, old: si };
      })
      .filter((u) => u.newStep !== u.old);

    if (updates.length === 0) return;

    void (async () => {
      setActionError(null);
      try {
        await Promise.all(updates.map((u) => updateProspect(u.id, { stepIndex: u.newStep })));
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Could not update steps after removing column");
        void refetch();
      }
    })();
  };

  const stageColor = (stage: HiringStage) => {
    switch (stage) {
      case "new":
        return "bg-sky-100 text-sky-700";
      case "screening":
        return "bg-amber-100 text-amber-700";
      case "interview":
        return "bg-indigo-100 text-indigo-700";
      case "hired":
        return "bg-emerald-100 text-emerald-700";
      case "rejected":
        return "bg-rose-100 text-rose-700";
      default:
        return "";
    }
  };

  const noBusiness = !currentBusiness?.id;

  const boardProspects = useMemo(
    () => prospects.filter((p) => prospectBelongsToActiveFunnel(p, activeFunnelId)),
    [prospects, activeFunnelId],
  );

  const onboardingFilteredProspects = useMemo(() => {
    let list = boardProspects;
    const q = onboardingSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.role && p.role.toLowerCase().includes(q)),
      );
    }
    const parsed = onboardingFilterDate;
    if (parsed) {
      const start = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
      const end = start + 86_400_000;
      list = list.filter((p) => {
        const t = new Date(p.createdAt).getTime();
        return t >= start && t < end;
      });
    }
    return list;
  }, [boardProspects, onboardingSearchQuery, onboardingFilterDate]);

  /** Table: skip the pool step column — identity + hiring stage already live in the first column (avoids a second “Prospects” with status). */
  const tableFunnelStepColumns = useMemo(
    () => columns.filter((c) => !isProspectsPoolColumn(c)),
    [columns],
  );

  /** Same denominator as the table: pool column is not a tracked “step” for completion %. */
  const completionColumns = useMemo(
    () => (tableFunnelStepColumns.length > 0 ? tableFunnelStepColumns : columns),
    [tableFunnelStepColumns, columns],
  );

  const funnelStepStatusEditor = (p: HiringProspect, col: PipelineColumn, editorCompact?: boolean) => {
    const cell = p.funnelStepStatuses?.[col.id];
    const rawStatus = cell?.status?.trim() || "";
    const selectValue = rawStatus || STATUS_NONE_VALUE;
    const busy = statusCellBusy.has(`${p.id}:${col.id}`);
    const opts = statusSelectOptions(statusLabels, rawStatus || undefined);
    const triggerClass = editorCompact
      ? "h-8 flex-1 min-w-0 text-left text-[11px]"
      : "h-9 flex-1 min-w-0 text-left text-xs";
    const plusClass = editorCompact ? "h-8 w-8 shrink-0 rounded-full" : "h-9 w-9 shrink-0 rounded-full";
    const noteBtnClass = editorCompact
      ? "h-7 text-[11px] border-rose-200 bg-rose-50/80 text-rose-800 hover:bg-rose-100 hover:text-rose-900"
      : "h-8 text-xs border-rose-200 bg-rose-50/80 text-rose-800 hover:bg-rose-100 hover:text-rose-900";
    const notePreviewClass = editorCompact
      ? "text-[10px] text-muted-foreground line-clamp-2"
      : "text-[11px] text-muted-foreground line-clamp-3";

    return (
      <div className="flex flex-col gap-2 py-1">
        <div className="flex items-center gap-1">
          <Select
            value={selectValue}
            disabled={loading || busy}
            onValueChange={(v) => {
              if (v === STATUS_NONE_VALUE) {
                void patchStepCell(p.id, col.id, { status: null });
              } else {
                void patchStepCell(p.id, col.id, { status: v });
              }
            }}
          >
            <SelectTrigger className={triggerClass}>
              <SelectValue placeholder="Choose status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_NONE_VALUE}>Choose status</SelectItem>
              {opts.map((label) => (
                <SelectItem key={label} value={label}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={plusClass}
            title="Add status label"
            disabled={!currentBusiness?.id || !activeFunnelId}
            onClick={() => setAddStatusOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={noteBtnClass}
          onClick={() => openStepNote(p.id, col.id)}
        >
          <StickyNote className="h-3.5 w-3.5 mr-1" />
          Add step note
        </Button>
        {cell?.note ? <p className={notePreviewClass}>{cell.note}</p> : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{activeFunnel?.name || "Onboarding funnel"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {noBusiness ? (
            <p className="text-sm text-muted-foreground">Select a business to manage onboarding.</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
            <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-muted-foreground">Funnel</div>
              <Select
                value={activeFunnelId ?? funnels[0]?.id ?? ""}
                onValueChange={(v) => setActiveFunnelId(v)}
                disabled={noBusiness || funnels.length === 0}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Funnel" />
                </SelectTrigger>
                <SelectContent>
                  {funnels.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-muted-foreground">Date</div>
              <Popover open={onboardingDatePickerOpen} onOpenChange={setOnboardingDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={noBusiness}
                    className={`h-9 w-full justify-start gap-2 font-normal ${
                      onboardingFilterDate ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <CalendarIcon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                    <span className="truncate">
                      {onboardingFilterDate
                        ? format(onboardingFilterDate, "MM/dd/yyyy")
                        : onboardingDateFilter.trim() || "MM/DD/YYYY"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    size="sm"
                    mode="single"
                    selected={onboardingFilterDate ?? undefined}
                    onSelect={(d) => {
                      if (d) {
                        setOnboardingDateFilter(format(d, "MM/dd/yyyy"));
                        setOnboardingDatePickerOpen(false);
                      }
                    }}
                    initialFocus
                  />
                  <div className="flex justify-end gap-2 border-t p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        setOnboardingDateFilter("");
                        setOnboardingDatePickerOpen(false);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1 md:col-span-4">
              <div className="text-xs text-muted-foreground">Search</div>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={onboardingSearchQuery}
                  onChange={(e) => setOnboardingSearchQuery(e.target.value)}
                  placeholder="Search"
                  disabled={noBusiness}
                  className="h-9 w-full pr-9"
                />
              </div>
            </div>
            <div className="flex items-end md:col-span-2">
              <Button
                type="button"
                disabled={noBusiness}
                className="h-9 w-full gap-1.5"
                onClick={() => setAddProspectOpen(true)}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 -ml-1 mr-0.5">
                  <UserPlus className="h-3.5 w-3.5" />
                </span>
                Add prospect
              </Button>
            </div>
            <div className="flex items-end md:col-span-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-full"
                disabled={noBusiness}
                onClick={() => setAddFunnelOpen(true)}
              >
                Add funnel
              </Button>
              <Modal
                isOpen={addFunnelOpen}
                onClose={() => {
                  setAddFunnelOpen(false);
                  setNewFunnelName("");
                  setNewFunnelColumns(DEFAULT_FUNNEL_COLUMNS);
                }}
                title="Add funnel"
              >
                <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">
                  Enter a funnel name and configure columns. This funnel is saved in this browser per business.
                </p>
                <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-1">
                  <div className="space-y-2">
                    <Label htmlFor="new-funnel-name">Funnel name</Label>
                    <Input
                      id="new-funnel-name"
                      placeholder="e.g. Warehouse Hiring"
                      value={newFunnelName}
                      onChange={(e) => setNewFunnelName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Columns</Label>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>Column name</TableHead>
                          <TableHead className="w-32 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newFunnelColumns.map((col, index) => (
                          <TableRow key={col.id}>
                            <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                            <TableCell>
                              <Input
                                value={col.name}
                                onChange={(e) =>
                                  handleNewFunnelColumnNameChange(col.id, e.target.value)
                                }
                              />
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={index === 0}
                                onClick={() => moveNewFunnelColumn(col.id, -1)}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={index === newFunnelColumns.length - 1}
                                onClick={() => moveNewFunnelColumn(col.id, 1)}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              {index > 0 ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600"
                                  disabled={newFunnelColumns.length <= 1}
                                  onClick={() => deleteNewFunnelColumn(col.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddColumnToNewFunnel}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add column
                    </Button>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setAddFunnelOpen(false);
                      setNewFunnelName("");
                      setNewFunnelColumns(DEFAULT_FUNNEL_COLUMNS);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleAddFunnel} disabled={!newFunnelName.trim()}>
                    Create funnel
                  </Button>
                </div>
              </Modal>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
            <p className="text-sm text-muted-foreground md:col-span-8">
              {loading ? "Loading prospects…" : "All prospects inside the funnel are shown here."}
            </p>
            <div className="flex h-9 w-full rounded-md border border-input bg-muted/40 p-0.5 md:col-span-2">
              <Button
                type="button"
                size="sm"
                variant={viewMode === "board" ? "secondary" : "ghost"}
                className="h-full flex-1 gap-1 rounded-sm px-2"
                onClick={() => setViewMode("board")}
                disabled={noBusiness}
              >
                <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                Board
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === "table" ? "secondary" : "ghost"}
                className="h-full flex-1 gap-1 rounded-sm px-2"
                onClick={() => setViewMode("table")}
                disabled={noBusiness}
              >
                <Table2 className="h-3.5 w-3.5 shrink-0" />
                Table
              </Button>
            </div>
            <div className="md:col-span-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-full"
                disabled={noBusiness || !activeFunnelId}
                onClick={() => setSettingsOpen(true)}
              >
                Funnel settings
              </Button>
              <Modal
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                title="Funnel settings"
                panelClassName="w-[95vw] max-w-3xl max-h-[85vh]"
              >
                <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">
                  Manage your funnels. Layout and funnel names are stored in this browser per business.
                </p>
                <div className="overflow-y-auto max-h-[62vh] pr-1">
                  <Label className="mb-2 block">Funnels</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funnel name</TableHead>
                        <TableHead className="w-24 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {funnels.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>
                            <Input
                              value={f.name}
                              onChange={(e) => handleFunnelNameChange(f.id, e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditFunnel(f.id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600"
                                disabled={funnels.length <= 1}
                                onClick={() => deleteFunnel(f.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Modal>
            </div>
          </div>

          <Modal
            isOpen={editFunnelOpen}
            onClose={() => setEditFunnelOpen(false)}
            title="Edit funnel"
            panelClassName="w-[95vw] max-w-5xl max-h-[90vh]"
          >
            <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">
              Update funnel name and column setup for this funnel.
            </p>
            <div className="overflow-y-auto max-h-[68vh] pr-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-funnel-name">Funnel name</Label>
                <Input
                  id="edit-funnel-name"
                  value={editFunnelName}
                  onChange={(e) => setEditFunnelName(e.target.value)}
                  placeholder="Enter funnel name"
                />
              </div>

              <div className="space-y-2">
                <Label>Columns</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Column name</TableHead>
                      <TableHead className="w-32 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editFunnelColumns.map((col, index) => (
                      <TableRow key={col.id}>
                        <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          <Input
                            value={col.name}
                            onChange={(e) =>
                              handleEditingFunnelColumnNameChange(col.id, e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={index === 0}
                            onClick={() => moveEditingFunnelColumn(col.id, -1)}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={index === editFunnelColumns.length - 1}
                            onClick={() => moveEditingFunnelColumn(col.id, 1)}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          {index > 0 ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600"
                              disabled={editFunnelColumns.length <= 1}
                              onClick={() => deleteEditingFunnelColumn(col.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddColumnToEditingFunnel}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add new column
                </Button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setEditFunnelOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSaveEditFunnel} disabled={!editFunnelName.trim()}>
                Save
              </Button>
            </div>
          </Modal>

          <Dialog
            open={addStatusOpen}
            onOpenChange={(open) => {
              setAddStatusOpen(open);
              if (!open) setNewStatusLabel("");
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add status label</DialogTitle>
                <DialogDescription>
                  New labels are saved in this browser for the current funnel and appear in every status dropdown.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Status name</label>
                <Input
                  placeholder="e.g. Scheduled"
                  value={newStatusLabel}
                  onChange={(e) => setNewStatusLabel(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddStatusOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAppendCustomStatus} disabled={!newStatusLabel.trim()}>
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={stepNoteOpen}
            onOpenChange={(open) => {
              setStepNoteOpen(open);
              if (!open) {
                setStepNoteContext(null);
                setStepNoteDraft("");
              }
            }}
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Step note</DialogTitle>
                <DialogDescription>Note for this prospect at this funnel step.</DialogDescription>
              </DialogHeader>
              <Textarea
                value={stepNoteDraft}
                onChange={(e) => setStepNoteDraft(e.target.value)}
                placeholder="Add a note for this step…"
                rows={5}
                className="resize-y min-h-[120px]"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setStepNoteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void saveStepNote()}>Save note</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AddHiringProspectDialog
            open={addProspectOpen}
            onOpenChange={setAddProspectOpen}
            createProspect={createProspect}
            businessId={currentBusiness?.id}
            preferredFunnelId={activeFunnelId}
            onError={setActionError}
          />

          {viewMode === "table" ? (
            <div className="overflow-x-auto rounded-md border">
              {columns.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Add columns in funnel settings to use the table.</p>
              ) : boardProspects.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No prospects in this funnel yet.</p>
              ) : onboardingFilteredProspects.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  No prospects match your search or date. Clear filters to see everyone in this funnel.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="min-w-[200px] whitespace-normal">Prospect</TableHead>
                      <TableHead className="w-[120px] whitespace-normal">Completion</TableHead>
                      {tableFunnelStepColumns.map((col) => (
                        <TableHead key={col.id} className="min-w-[150px] max-w-[180px] whitespace-normal">
                          <span className="line-clamp-2">{col.name || "Step"}</span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {onboardingFilteredProspects.map((p) => {
                      const pct = completionForProspect(p, completionColumns);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="align-top">
                            <div className="space-y-0.5 py-1">
                              <div className="text-sm font-medium">{p.name}</div>
                              <div className="text-xs text-muted-foreground">{p.email}</div>
                              <div className="text-xs text-muted-foreground">
                                {p.role} • {p.source}
                              </div>
                              <Badge className={`mt-1 ${stageColor(p.stage)}`} variant="outline">
                                {stageLabel[p.stage]}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="space-y-1 py-1 w-[100px]">
                              <Progress value={pct} className="h-2" />
                              <span className="text-xs text-muted-foreground">{pct}%</span>
                            </div>
                          </TableCell>
                          {tableFunnelStepColumns.map((col) => (
                            <TableCell key={col.id} className="align-top min-w-[160px]">
                              {funnelStepStatusEditor(p, col, false)}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-muted/30 p-4 pb-2 dark:bg-muted/15">
              <div
                className="grid gap-x-3 gap-y-2 items-stretch"
                style={{
                  gridTemplateColumns: `repeat(${columns.length}, minmax(280px, 320px))`,
                }}
              >
                {columns.map((column) => (
                  <div
                    key={`head-${column.id}`}
                    className="flex flex-col rounded-lg border bg-card px-4 py-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{column.name || "Untitled step"}</span>
                      {isProspectsPoolColumn(column) ? (
                        <Badge variant="outline" className="text-xs">
                          {onboardingFilteredProspects.length}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                ))}
                {boardProspects.length === 0 ? (
                  <div
                    className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground"
                    style={{ gridColumn: "1 / -1" }}
                  >
                    No prospects in this funnel yet.
                  </div>
                ) : onboardingFilteredProspects.length === 0 ? (
                  <div
                    className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground"
                    style={{ gridColumn: "1 / -1" }}
                  >
                    No prospects match your search or date. Clear filters to see everyone in this funnel.
                  </div>
                ) : (
                  onboardingFilteredProspects.flatMap((p, rowIdx) =>
                    columns.map((column) => {
                      const rowBg =
                        rowIdx % 2 === 0
                          ? "bg-sky-50/90 border-sky-100/80 dark:bg-sky-950/30 dark:border-sky-900/50"
                          : "bg-teal-50/80 border-teal-100/70 dark:bg-teal-950/25 dark:border-teal-900/45";
                      if (isProspectsPoolColumn(column)) {
                        const completionPct = completionForProspect(p, completionColumns);
                        return (
                          <div
                            key={`${p.id}:${column.id}`}
                            className={`flex h-full min-h-0 flex-col rounded-lg border p-3 shadow-sm space-y-2 ${rowBg}`}
                            aria-label={`${p.name}, pool`}
                          >
                            <div className="space-y-0.5">
                              <div className="text-sm font-medium">{p.name}</div>
                              <div className="text-[11px] text-muted-foreground">{p.email}</div>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {p.role} • {p.source}
                            </div>
                            <div className="space-y-1 pt-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Completion
                                </span>
                                <span className="text-[11px] tabular-nums text-muted-foreground">
                                  {completionPct}%
                                </span>
                              </div>
                              <Progress value={completionPct} className="h-1.5" />
                            </div>
                            <Badge className={`w-fit ${stageColor(p.stage)}`} variant="outline">
                              {stageLabel[p.stage]}
                            </Badge>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={`${p.id}:${column.id}`}
                          className={`flex h-full min-h-0 flex-col rounded-lg border p-2 shadow-sm ${rowBg}`}
                          aria-label={`${p.name}, ${column.name || "Step"}`}
                        >
                          {funnelStepStatusEditor(p, column, true)}
                        </div>
                      );
                    }),
                  )
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
