import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

export default function ProspectsTab() {
  const [prospects, setProspects] = useState<Applicant[]>([]);

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
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
