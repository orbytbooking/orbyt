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

export default function ContactsTab() {
  const [contacts, setContacts] = useState<Applicant[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = JSON.parse(localStorage.getItem(APPLICANTS_KEY) || "[]") as Applicant[];
      if (Array.isArray(stored)) setContacts(stored);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
          <CardDescription>
            View all people who have entered your hiring pipeline, regardless of stage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No contacts yet. Add applicants from the Onboarding tab.
                    </TableCell>
                  </TableRow>
                )}
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.email}</TableCell>
                    <TableCell>{c.role}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.source}</TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">
                      {c.stage}
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
