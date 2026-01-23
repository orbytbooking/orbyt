import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";

type Quiz = {
  id: string;
  title: string;
  role: string;
  questions: string;
  updatedAt: string;
};

const STORAGE_KEY = "hiringQuizzes";

export default function QuizzesTab() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [form, setForm] = useState({ title: "", role: "", questions: "" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(stored)) setQuizzes(stored);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quizzes));
  }, [quizzes]);

  const handleAdd = () => {
    if (!form.title.trim() || !form.questions.trim()) return;
    const now = new Date().toISOString();
    const quiz: Quiz = {
      id: `QZ-${Date.now()}`,
      title: form.title.trim(),
      role: form.role.trim() || "Any role",
      questions: form.questions.trim(),
      updatedAt: now,
    };
    setQuizzes((prev) => [quiz, ...prev]);
    setForm({ title: "", role: "", questions: "" });
  };

  const remove = (id: string) => {
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quizzes</CardTitle>
          <CardDescription>
            Create interview and onboarding quizzes your team can use when evaluating candidates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create quiz */}
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[2fr_1.2fr_auto]">
              <Input
                placeholder="Quiz title (e.g. Cleaning skills test)"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
              <Input
                placeholder="Role (optional)"
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              />
              <Button onClick={handleAdd} className="whitespace-nowrap">
                Save quiz
              </Button>
            </div>
            <Textarea
              rows={4}
              placeholder="Enter your questions here, for example:
1. How many years of cleaning experience do you have?
2. How would you handle a client who is not satisfied with the service?"
              value={form.questions}
              onChange={(e) => setForm((p) => ({ ...p, questions: e.target.value }))}
            />
          </div>

          {/* Quiz list */}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quizzes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No quizzes yet. Create your first quiz above.
                    </TableCell>
                  </TableRow>
                )}
                {quizzes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {q.role || "Any"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(q.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => remove(q.id)}
                      >
                        Delete
                      </Button>
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
