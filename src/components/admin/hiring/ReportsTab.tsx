import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const APPLICANTS_KEY = "hiringApplicants";

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

type SummaryRow = {
  label: string;
  value: number | string;
};

export default function ReportsTab() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = JSON.parse(localStorage.getItem(APPLICANTS_KEY) || "[]") as Applicant[];
      if (Array.isArray(stored)) setApplicants(stored);
    } catch {
      // ignore
    }
  }, []);

  const total = applicants.length;
  const byStage: Record<HiringStage, number> = {
    new: applicants.filter((a) => a.stage === "new").length,
    screening: applicants.filter((a) => a.stage === "screening").length,
    interview: applicants.filter((a) => a.stage === "interview").length,
    hired: applicants.filter((a) => a.stage === "hired").length,
    rejected: applicants.filter((a) => a.stage === "rejected").length,
  };

  const hiresThisMonth = applicants.filter((a) => {
    if (a.stage !== "hired") return false;
    const d = new Date(a.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const summary: SummaryRow[] = [
    { label: "Total applicants", value: total },
    { label: "New", value: byStage.new },
    { label: "Screening", value: byStage.screening },
    { label: "Interview", value: byStage.interview },
    { label: "Hired", value: byStage.hired },
    { label: "Rejected", value: byStage.rejected },
    { label: "Hires this month", value: hiresThisMonth },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hiring reports</CardTitle>
          <CardDescription>
            A quick snapshot of how many applicants are in each stage of your hiring pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border max-w-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right">{row.value}</TableCell>
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
