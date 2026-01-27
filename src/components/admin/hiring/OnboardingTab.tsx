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

type HiringStage = "new" | "screening" | "interview" | "hired" | "rejected";

type Applicant = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  source: string;
  stage: HiringStage;
  createdAt: string;
  // Index of the pipeline column the applicant is in
  stepIndex?: number;
};

const STORAGE_KEY = "hiringApplicants";
const COLUMNS_KEY = "hiringFunnelColumns";

type PipelineColumn = {
  id: string;
  name: string;
};

const stageLabel: Record<HiringStage, string> = {
  new: "New",
  screening: "Screening",
  interview: "Interview",
  hired: "Hired",
  rejected: "Rejected",
};

export default function OnboardingTab() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [newApplicant, setNewApplicant] = useState({
    name: "",
    email: "",
    role: "",
    source: "Manual",
  });
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Load from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(stored)) {
        // Ensure each applicant has a stepIndex
        const hydrated = (stored as Applicant[]).map((a) => ({
          ...a,
          stepIndex: typeof a.stepIndex === "number" ? a.stepIndex : 0,
        }));
        setApplicants(hydrated);
      }
    } catch {
      // ignore
    }

    // Load funnel columns
    try {
      const storedCols = JSON.parse(localStorage.getItem(COLUMNS_KEY) || "null");
      if (Array.isArray(storedCols) && storedCols.length > 0) {
        setColumns(storedCols);
      } else {
        const defaults: PipelineColumn[] = [
          { id: "prospects", name: "Prospects" },
          { id: "pre-hiring-form", name: "Pre‑Hiring Form" },
          { id: "first-interview", name: "First Interview" },
          { id: "final-policy", name: "Final Policy Quiz" },
          { id: "ids-collected", name: "IDs collected" },
          { id: "tax-forms", name: "Tax Forms" },
        ];
        setColumns(defaults);
        localStorage.setItem(COLUMNS_KEY, JSON.stringify(defaults));
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applicants));
  }, [applicants]);

  // Persist columns
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (columns.length > 0) {
      localStorage.setItem(COLUMNS_KEY, JSON.stringify(columns));
    }
  }, [columns]);

  const handleAddApplicant = () => {
    if (!newApplicant.name.trim() || !newApplicant.email.trim() || !newApplicant.role.trim()) return;
    const now = new Date().toISOString();
    const applicant: Applicant = {
      id: `AP-${Date.now()}`,
      name: newApplicant.name.trim(),
      email: newApplicant.email.trim(),
      role: newApplicant.role.trim(),
      source: newApplicant.source,
      stage: "new",
      createdAt: now,
      stepIndex: 0,
    };
    setApplicants((prev) => [applicant, ...prev]);
    setNewApplicant({ name: "", email: "", role: "", source: "Manual" });
  };

  const moveStep = (id: string, dir: -1 | 1) => {
    setApplicants((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const maxIndex = Math.max(columns.length - 1, 0);
        const nextIndex = Math.min(
          maxIndex,
          Math.max(0, (a.stepIndex ?? 0) + dir),
        );
        return { ...a, stepIndex: nextIndex };
      }),
    );
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
      // Clamp applicants to new bounds
      setApplicants((apps) =>
        apps.map((a) => ({
          ...a,
          stepIndex: Math.min(copy.length - 1, Math.max(0, a.stepIndex ?? 0)),
        })),
      );
      return copy;
    });
  };

  const deleteColumn = (id: string) => {
    setColumns((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const next = prev.filter((c) => c.id !== id);
      setApplicants((apps) =>
        apps.map((a) => {
          const si = a.stepIndex ?? 0;
          if (si === idx) return { ...a, stepIndex: Math.max(0, idx - 1) };
          if (si > idx) return { ...a, stepIndex: si - 1 };
          return a;
        }),
      );
      return next;
    });
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Onboarding funnel</CardTitle>
          <CardDescription>
            Visualize prospects moving through your hiring steps, similar to BookingKoala&apos;s onboarding board.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick add applicant */}
          <div className="grid gap-3 md:grid-cols-[1.5fr_1.5fr_1.5fr_1fr_auto]">
            <Input
              placeholder="Applicant name"
              value={newApplicant.name}
              onChange={(e) => setNewApplicant((p) => ({ ...p, name: e.target.value }))}
            />
            <Input
              placeholder="Email"
              value={newApplicant.email}
              onChange={(e) => setNewApplicant((p) => ({ ...p, email: e.target.value }))}
            />
            <Input
              placeholder="Role (e.g. Field Cleaner)"
              value={newApplicant.role}
              onChange={(e) => setNewApplicant((p) => ({ ...p, role: e.target.value }))}
            />
            <Input
              placeholder="Source (e.g. Indeed, FB Ads)"
              value={newApplicant.source}
              onChange={(e) => setNewApplicant((p) => ({ ...p, source: e.target.value }))}
            />
            <Button onClick={handleAddApplicant} className="whitespace-nowrap">
              Add prospect
            </Button>
          </div>

          {/* Header row with funnel settings */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              All prospects inside the funnel are shown here.
            </p>
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Funnel settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Funnel settings</DialogTitle>
                  <DialogDescription>
                    Add, rename, delete, and reorder the columns in your onboarding funnel. Settings are
                    stored locally in your browser.
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
                const columnApplicants = applicants.filter(
                  (a) => (a.stepIndex ?? 0) === index,
                );
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
                                size="xs"
                                disabled={index === 0}
                                onClick={() => moveStep(a.id, -1)}
                              >
                                ←
                              </Button>
                              <Button
                                variant="outline"
                                size="xs"
                                disabled={index === columns.length - 1}
                                onClick={() => moveStep(a.id, 1)}
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
