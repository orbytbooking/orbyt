"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfDay } from "date-fns";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { useHiringProspects, type HiringProspect } from "@/hooks/useHiringProspects";
import { CalendarIcon, CalendarPlus, ChevronDown, Info, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function mergeInterviewNotes(
  currentNote: string | undefined,
  privateNote: string,
  sharedNote: string,
): string | undefined {
  const priv = privateNote.trim();
  const shared = sharedNote.trim();
  if (!priv && !shared) return undefined;
  const base = (currentNote ?? "").trim();
  const blocks: string[] = [];
  if (priv) blocks.push(`Private note:\n${priv}`);
  if (shared) blocks.push(`Shared note:\n${shared}`);
  const addition = blocks.join("\n\n");
  if (!base) return addition;
  return `${base}\n\n—\n${addition}`;
}

function scheduleLabelRow(p: HiringProspect) {
  return p.name?.trim() || [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || p.email;
}

/** `HH:mm` (from `<input type="time" />`) + calendar date → ISO UTC */
function combineLocalDateAndTimeToIso(date: Date, hhmm: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Math.min(23, parseInt(m[1], 10));
  const min = Math.min(59, parseInt(m[2], 10));
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  const d = startOfDay(date);
  d.setHours(h, min, 0, 0);
  return d.toISOString();
}

function formatInterviewSlot(p: HiringProspect): string {
  const s = p.interviewStartsAt;
  const e = p.interviewEndsAt;
  if (!s) return "—";
  const ds = new Date(s);
  if (Number.isNaN(ds.getTime())) return "—";
  const datePart = format(ds, "MM/dd/yyyy");
  const t1 = format(ds, "h:mm a");
  if (e) {
    const de = new Date(e);
    if (!Number.isNaN(de.getTime())) {
      const t2 = format(de, "h:mm a");
      return `${datePart} · ${t1} – ${t2}`;
    }
  }
  return `${datePart} · ${t1}`;
}

export default function InterviewsTab() {
  const router = useRouter();
  const { prospects, loading, error, updateProspect, sendInterviewNotification } = useHiringProspects();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [prospectId, setProspectId] = useState<string>("");
  const [privateNote, setPrivateNote] = useState("");
  const [sharedNote, setSharedNote] = useState("");
  const [sendNotifications, setSendNotifications] = useState(true);
  const [prospectPickerOpen, setProspectPickerOpen] = useState(false);
  const [prospectSearch, setProspectSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [interviewDate, setInterviewDate] = useState<Date>(() => startOfDay(new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const interviews = useMemo(() => {
    return prospects
      .filter((p) => p.stage === "interview")
      .slice()
      .sort((a, b) => {
        const as = a.interviewStartsAt ? new Date(a.interviewStartsAt).getTime() : Number.POSITIVE_INFINITY;
        const bs = b.interviewStartsAt ? new Date(b.interviewStartsAt).getTime() : Number.POSITIVE_INFINITY;
        if (as !== bs) return as - bs;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [prospects]);

  const scheduleableProspects = useMemo(() => {
    return prospects.filter((p) => p.stage === "new" || p.stage === "screening");
  }, [prospects]);

  const filteredPickList = useMemo(() => {
    const q = prospectSearch.trim().toLowerCase();
    if (!q) return scheduleableProspects;
    return scheduleableProspects.filter((p) => {
      const hay = `${scheduleLabelRow(p)} ${p.email} ${p.phone ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [scheduleableProspects, prospectSearch]);

  const selectedProspect = prospectId ? prospects.find((p) => p.id === prospectId) : undefined;

  const resetScheduleForm = useCallback(() => {
    setProspectId("");
    setPrivateNote("");
    setSharedNote("");
    setSendNotifications(true);
    setProspectSearch("");
    setProspectPickerOpen(false);
    setInterviewDate(startOfDay(new Date()));
    setStartTime("09:00");
    setEndTime("10:00");
    setDatePickerOpen(false);
  }, []);

  useEffect(() => {
    if (scheduleOpen) resetScheduleForm();
  }, [scheduleOpen, resetScheduleForm]);

  const handleScheduleInterview = async () => {
    if (!prospectId) {
      toast.error("Choose a prospect.");
      return;
    }
    const prospect = prospects.find((p) => p.id === prospectId);
    if (!prospect) {
      toast.error("Prospect not found.");
      return;
    }
    const startIso = combineLocalDateAndTimeToIso(interviewDate, startTime);
    const endIso = combineLocalDateAndTimeToIso(interviewDate, endTime);
    if (!startIso || !endIso) {
      toast.error("Enter a valid date, start time, and end time.");
      return;
    }
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      toast.error("End time must be after start time.");
      return;
    }

    const noteUpdate = mergeInterviewNotes(prospect.note, privateNote, sharedNote);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    setSubmitting(true);
    try {
      await updateProspect(prospectId, {
        stage: "interview",
        interviewStartsAt: startIso,
        interviewEndsAt: endIso,
        ...(noteUpdate !== undefined ? { note: noteUpdate } : {}),
      });
      if (sendNotifications) {
        try {
          await sendInterviewNotification(prospectId, {
            interviewStartsAt: startIso,
            interviewEndsAt: endIso,
            timezone,
            sharedNote,
          });
        } catch (notifyErr) {
          toast.error(
            notifyErr instanceof Error
              ? `Interview saved, but notification was not sent: ${notifyErr.message}`
              : "Interview saved, but notification was not sent.",
          );
          setScheduleOpen(false);
          return;
        }
      }
      toast.success("Interview scheduled.");
      setScheduleOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not schedule interview.");
    } finally {
      setSubmitting(false);
    }
  };

  const labelWithInfo = (text: string, tooltip: string) => (
    <div className="flex items-center gap-1.5">
      <Label className="text-sm font-medium text-slate-800">{text}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`About ${text}`}
          >
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Interviews</CardTitle>
              <CardDescription>Applicants scheduled or in the interview stage.</CardDescription>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2 sm:flex-nowrap">
              <Button
                type="button"
                className="gap-1.5 bg-sky-600 text-white hover:bg-sky-700"
                onClick={() => setScheduleOpen(true)}
              >
                <CalendarPlus className="h-4 w-4" aria-hidden />
                Schedule interview
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && interviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {!loading && interviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        No interviews scheduled yet. Use Schedule interview to move a prospect here, or move them
                        from the Onboarding tab.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {interviews.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            className="font-medium text-left hover:underline"
                            onClick={() => router.push(`/admin/hiring?tab=prospects&prospectId=${encodeURIComponent(a.id)}`)}
                          >
                            {scheduleLabelRow(a)}
                          </button>
                          <div className="text-xs text-muted-foreground">{a.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatInterviewSlot(a)}
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

        <Sheet open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <SheetContent
            side="right"
            className={cn(
              "flex h-full w-full flex-col gap-0 border-l bg-background p-0 sm:max-w-lg",
              "[&>button]:text-red-600 [&>button]:hover:text-red-700 [&>button]:hover:bg-red-50",
            )}
          >
            <SheetHeader className="space-y-0 border-b px-6 py-4 text-left">
              <SheetTitle className="text-xl font-semibold text-slate-900 pr-10">Schedule interview</SheetTitle>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
              <div className="space-y-2">
                {labelWithInfo(
                  "Prospect name",
                  "Choose an active prospect. They will be moved to the Interview stage.",
                )}
                <Popover open={prospectPickerOpen} onOpenChange={setProspectPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={prospectPickerOpen}
                      className="h-11 w-full justify-between font-normal"
                    >
                      <span className={cn(!selectedProspect && "text-muted-foreground")}>
                        {selectedProspect ? scheduleLabelRow(selectedProspect) : "Choose Prospect"}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="z-[100] w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <div className="border-b p-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="h-9 pl-8"
                          placeholder="Type and hit enter to filter"
                          value={prospectSearch}
                          onChange={(e) => setProspectSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && filteredPickList.length === 1) {
                              setProspectId(filteredPickList[0].id);
                              setProspectPickerOpen(false);
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto p-1">
                      {filteredPickList.length === 0 ? (
                        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                          {scheduleableProspects.length === 0
                            ? "No prospects in New or Screening. Add prospects from the Prospects tab first."
                            : "No prospects match your search."}
                        </p>
                      ) : (
                        filteredPickList.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className={cn(
                              "flex w-full rounded-md px-2 py-2.5 text-left text-sm hover:bg-muted",
                              p.id === prospectId && "bg-muted",
                            )}
                            onClick={() => {
                              setProspectId(p.id);
                              setProspectPickerOpen(false);
                            }}
                          >
                            {scheduleLabelRow(p)}
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-900">Date</Label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full justify-start gap-2 font-normal text-left"
                      >
                        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span>{format(interviewDate, "MM/dd/yyyy")}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="z-[100] w-auto p-0" align="start">
                      <Calendar
                        size="sm"
                        mode="single"
                        selected={interviewDate}
                        onSelect={(d) => {
                          if (d) {
                            setInterviewDate(startOfDay(d));
                            setDatePickerOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-900">Start time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-11 bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-900">End time</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-11 bg-background"
                  />
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {labelWithInfo(
                  "Private note",
                  "Internal note stored on the prospect profile. Not emailed to the candidate.",
                )}
                <Textarea
                  value={privateNote}
                  onChange={(e) => setPrivateNote(e.target.value)}
                  placeholder=""
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="mt-5 space-y-2">
                {labelWithInfo(
                  "Shared note",
                  "Appended to the prospect profile so your team sees context. Candidate email notifications are not sent from this field yet.",
                )}
                <Textarea
                  value={sharedNote}
                  onChange={(e) => setSharedNote(e.target.value)}
                  placeholder=""
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                <Checkbox
                  id="send-interview-notifications"
                  checked={sendNotifications}
                  onCheckedChange={(v) => setSendNotifications(v === true)}
                  className="mt-0.5"
                />
                <div className="flex min-w-0 flex-1 items-start gap-1.5">
                  <Label htmlFor="send-interview-notifications" className="cursor-pointer text-sm font-medium leading-snug">
                    Send notifications
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="shrink-0 rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="About send notifications"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      When interview emails are enabled, we will notify the candidate from here. This preference is
                      saved for this action only for now.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            <SheetFooter className="mt-auto flex flex-row items-center justify-between gap-3 border-t bg-background px-6 py-4 sm:justify-between">
              <Button
                type="button"
                className="min-w-[140px] bg-sky-600 text-white hover:bg-sky-700"
                disabled={submitting}
                onClick={() => void handleScheduleInterview()}
              >
                {submitting ? "Scheduling…" : "Schedule Interview"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={submitting}
                onClick={() => setScheduleOpen(false)}
              >
                Cancel
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
