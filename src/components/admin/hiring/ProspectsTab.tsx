import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "lucide-react";

// Reuse same storage as Onboarding so data stays in sync across tabs
const STORAGE_KEY = "hiringApplicants";

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
};

const stageLabel: Record<HiringStage, string> = {
  new: "New",
  screening: "Screening",
  interview: "Interview",
  hired: "Hired",
  rejected: "Rejected",
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
  const [prospects, setProspects] = useState<Applicant[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    note: "",
    addToFunnel: true,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Applicant[];
      if (Array.isArray(stored)) {
        setProspects(stored.filter((a) => a.stage === "new" || a.stage === "screening"));
      }
    } catch {
      // ignore
    }
  }, []);

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

  const handleAddProspect = () => {
    if (!form.firstName.trim() || !form.email.trim()) return;

    const name = `${form.firstName.trim()}${form.lastName.trim() ? ` ${form.lastName.trim()}` : ""}`;
    const now = new Date().toISOString();

    const applicant: Applicant = {
      id: `AP-${Date.now()}`,
      name,
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      role: "Prospect",
      source: "Manual",
      stage: "new",
      createdAt: now,
    };

    if (typeof window !== "undefined") {
      try {
        const storedRaw = localStorage.getItem(STORAGE_KEY);
        const stored = storedRaw ? (JSON.parse(storedRaw) as Applicant[]) : [];
        const next = Array.isArray(stored) ? [applicant, ...stored] : [applicant];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
    }

    setProspects((prev) => [applicant, ...prev]);

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Prospects</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This section displays all prospects submitted by applicants.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Phone number</label>
                    <Input
                      placeholder="___-___-____"
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
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
        </div>
      </div>
      <Card>
        <CardHeader className="sr-only">
          <CardTitle>Prospects</CardTitle>
          <CardDescription>Candidates currently in the early stages of your hiring funnel.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No prospects yet. Add applicants from the Onboarding tab.
                    </TableCell>
                  </TableRow>
                )}
                {prospects.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground">{a.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{a.role}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.source}</TableCell>
                    <TableCell>
                      <Badge className={stageColor(a.stage)} variant="outline">
                        {stageLabel[a.stage]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
