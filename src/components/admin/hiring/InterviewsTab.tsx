import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

export default function InterviewsTab() {
  const [interviews, setInterviews] = useState<Applicant[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Applicant[];
      if (Array.isArray(stored)) {
        setInterviews(stored.filter((a) => a.stage === "interview"));
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Interviews</CardTitle>
          <CardDescription>Applicants scheduled or in the interview stage.</CardDescription>
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
                {interviews.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No interviews scheduled yet. Move applicants to the Interview stage from the Onboarding tab.
                    </TableCell>
                  </TableRow>
                )}
                {interviews.map((a) => (
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
                      <Badge variant="outline" className="bg-indigo-100 text-indigo-700">
                        Interview
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
