import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { useHiringProspects, type HiringProspect, type HiringStage } from "@/hooks/useHiringProspects";

const COLUMNS_KEY_PREFIX = "hiringFunnelColumns";

type PipelineColumn = {
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

function splitFullName(full: string): { firstName: string; lastName?: string } {
  const t = full.trim();
  const i = t.indexOf(" ");
  if (i === -1) return { firstName: t };
  const first = t.slice(0, i).trim();
  const last = t.slice(i + 1).trim();
  return { firstName: first || t, lastName: last || undefined };
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

  const [newApplicant, setNewApplicant] = useState({
    name: "",
    email: "",
    role: "",
    source: "Manual",
  });
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [stepBusyId, setStepBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const columnsStorageKey = currentBusiness?.id
    ? `${COLUMNS_KEY_PREFIX}:${currentBusiness.id}`
    : null;

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

  const handleAddApplicant = async () => {
    if (!newApplicant.name.trim() || !newApplicant.email.trim() || !newApplicant.role.trim()) return;
    if (!currentBusiness?.id) return;
    setActionError(null);
    setAdding(true);
    try {
      const { firstName, lastName } = splitFullName(newApplicant.name);
      await createProspect({
        firstName,
        lastName,
        email: newApplicant.email.trim(),
        role: newApplicant.role.trim(),
        source: newApplicant.source.trim() || "Manual",
        stepIndex: 0,
      });
      setNewApplicant({ name: "", email: "", role: "", source: "Manual" });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not add prospect");
    } finally {
      setAdding(false);
    }
  };

  const moveStep = async (id: string, dir: -1 | 1) => {
    const p = prospects.find((x) => x.id === id);
    if (!p) return;
    const maxIndex = Math.max(columns.length - 1, 0);
    const nextIndex = Math.min(maxIndex, Math.max(0, (p.stepIndex ?? 0) + dir));
    if (nextIndex === (p.stepIndex ?? 0)) return;
    setActionError(null);
    setStepBusyId(id);
    try {
      await updateProspect(id, { stepIndex: nextIndex });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not move prospect");
    } finally {
      setStepBusyId(null);
    }
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

  const maxColIndex = Math.max(0, columns.length - 1);
  const stepForColumn = (a: HiringProspect) =>
    Math.min(Math.max(0, a.stepIndex ?? 0), maxColIndex);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Onboarding funnel</CardTitle>
          <CardDescription>
            Visualize prospects moving through your hiring steps on an onboarding board. Prospects are saved
            to your account; column names and order are stored in this browser for each business.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {noBusiness ? (
            <p className="text-sm text-muted-foreground">Select a business to manage onboarding.</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

          {/* Quick add applicant */}
          <div className="grid gap-3 md:grid-cols-[1.5fr_1.5fr_1.5fr_1fr_auto]">
            <Input
              placeholder="Applicant name"
              value={newApplicant.name}
              onChange={(e) => setNewApplicant((p) => ({ ...p, name: e.target.value }))}
              disabled={noBusiness || adding}
            />
            <Input
              placeholder="Email"
              value={newApplicant.email}
              onChange={(e) => setNewApplicant((p) => ({ ...p, email: e.target.value }))}
              disabled={noBusiness || adding}
            />
            <Input
              placeholder="Role (e.g. Field Cleaner)"
              value={newApplicant.role}
              onChange={(e) => setNewApplicant((p) => ({ ...p, role: e.target.value }))}
              disabled={noBusiness || adding}
            />
            <Input
              placeholder="Source (e.g. Indeed, FB Ads)"
              value={newApplicant.source}
              onChange={(e) => setNewApplicant((p) => ({ ...p, source: e.target.value }))}
              disabled={noBusiness || adding}
            />
            <Button
              onClick={() => void handleAddApplicant()}
              className="whitespace-nowrap"
              disabled={noBusiness || adding || loading}
            >
              {adding ? "Adding…" : "Add prospect"}
            </Button>
          </div>

          {/* Header row with funnel settings */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading prospects…" : "All prospects inside the funnel are shown here."}
            </p>
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={noBusiness}>
                  Funnel settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Funnel settings</DialogTitle>
                  <DialogDescription>
                    Add, rename, delete, and reorder the columns in your onboarding funnel. Column layout is
                    stored in this browser per business. Moving cards updates each prospect in the database.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Column name</TableHead>
                        <TableHead className="w-32 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {columns.map((col, index) => (
                        <TableRow key={col.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={col.name}
                              onChange={(e) =>
                                handleColumnNameChange(col.id, e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={index === 0}
                              onClick={() => moveColumn(col.id, -1)}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={index === columns.length - 1}
                              onClick={() => moveColumn(col.id, 1)}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600"
                              disabled={columns.length <= 1}
                              onClick={() => deleteColumn(col.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={handleAddColumn}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add column
                  </Button>
                </div>
                <DialogFooter />
              </DialogContent>
            </Dialog>
          </div>

          {/* Columns */}
          <div className="overflow-x-auto pb-2">
            <div className="grid auto-cols-[260px] grid-flow-col gap-4">
              {columns.map((column, index) => {
                const columnApplicants = prospects.filter((a) => stepForColumn(a) === index);
                return (
                  <Card key={column.id} className="flex flex-col h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm font-semibold">
                          {column.name || "Untitled step"}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {columnApplicants.length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {columnApplicants.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          No prospects in this step yet.
                        </p>
                      )}
                      {columnApplicants.map((a) => (
                        <div
                          key={a.id}
                          className="rounded-lg border bg-card p-3 shadow-sm space-y-2"
                        >
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium">{a.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {a.email}
                            </div>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {a.role} • {a.source}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <Badge className={stageColor(a.stage)} variant="outline">
                              {stageLabel[a.stage]}
                            </Badge>
                            <div className="space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                disabled={index === 0 || stepBusyId === a.id || loading}
                                onClick={() => void moveStep(a.id, -1)}
                              >
                                ←
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                disabled={index === columns.length - 1 || stepBusyId === a.id || loading}
                                onClick={() => void moveStep(a.id, 1)}
                              >
                                →
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
