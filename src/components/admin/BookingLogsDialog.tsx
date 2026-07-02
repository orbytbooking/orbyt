"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { format } from "date-fns";
import { Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookingLogDetailDialog } from "@/components/admin/BookingLogDetailDialog";

type ActivityRow = {
  id: string;
  created_at: string;
  activity_text: string;
  actor_name: string | null;
  event_key: string | null;
};

type EmailRow = {
  id: string;
  created_at: string;
  to_email: string;
  subject: string;
  status: string;
  error_message: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string | null;
  businessId: string;
};

function ActivityWithBoldName({ text, actorName }: { text: string; actorName: string | null }) {
  const match = text.match(/^(.*?)(\sfor\s)(.+?)(\sby\s)(.+)$/i);
  if (match) {
    const [, prefix, forWord, customer, byWord, actor] = match;
    return (
      <>
        {prefix}
        {forWord}
        <strong className="font-semibold text-slate-900 dark:text-slate-100">{customer}</strong>
        {byWord}
        <strong className="font-semibold text-slate-900 dark:text-slate-100">{actor}</strong>
      </>
    );
  }

  const name = (actorName || "").trim();
  if (!name) return <span>{text}</span>;
  const idx = text.lastIndexOf(name);
  if (idx < 0) return <span>{text}</span>;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-semibold text-slate-900 dark:text-slate-100">{name}</strong>
      {text.slice(idx + name.length)}
    </>
  );
}

export function BookingLogsDialog({ open, onOpenChange, bookingId, businessId }: Props) {
  const [tab, setTab] = useState<"booking" | "email">("booking");
  const [bookingLogs, setBookingLogs] = useState<ActivityRow[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailRow[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fetchNote, setFetchNote] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLogId, setDetailLogId] = useState<string | null>(null);
  const [detailLogPreview, setDetailLogPreview] = useState<ActivityRow | null>(null);
  const [emailDetailOpen, setEmailDetailOpen] = useState(false);
  const [emailDetailBody, setEmailDetailBody] = useState("");

  const load = useCallback(async () => {
    if (!bookingId || !businessId) {
      setHasLoaded(true);
      setBookingLogs([]);
      setEmailLogs([]);
      return;
    }
    setHasLoaded(false);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${encodeURIComponent(bookingId)}/logs`, {
        credentials: "include",
        headers: { "x-business-id": businessId },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(typeof data.error === "string" ? data.error : "Failed to load logs.");
        setBookingLogs([]);
        setEmailLogs([]);
        return;
      }
      setBookingLogs(Array.isArray(data.bookingLogs) ? data.bookingLogs : []);
      setEmailLogs(Array.isArray(data.emailLogs) ? data.emailLogs : []);
      setFetchNote(typeof data.fetchNote === "string" ? data.fetchNote : null);
    } catch {
      setLoadError("Network error.");
      setBookingLogs([]);
      setEmailLogs([]);
    } finally {
      setHasLoaded(true);
    }
  }, [bookingId, businessId]);

  useEffect(() => {
    if (open && bookingId) void load();
  }, [open, bookingId, load]);

  useEffect(() => {
    if (!open) {
      setTab("booking");
      setDetailOpen(false);
      setHasLoaded(false);
      setLoadError(null);
      setFetchNote(null);
      setBookingLogs([]);
      setEmailLogs([]);
    }
  }, [open]);

  const formatDateTimeCell = (iso: string) => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
      return {
        date: format(d, "MM/dd/yyyy"),
        time: format(d, "hh:mm a"),
      };
    } catch {
      return { date: "—", time: "" };
    }
  };

  const openBookingLogDetail = (row: ActivityRow) => {
    setDetailLogPreview(row);
    setDetailLogId(row.id);
    setDetailOpen(true);
  };

  const openEmailDetail = (row: EmailRow) => {
    setEmailDetailBody(
      [
        `When: ${row.created_at}`,
        `To: ${row.to_email}`,
        `Subject: ${row.subject}`,
        `Status: ${row.status}`,
        row.error_message ? `Error: ${row.error_message}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    );
    setEmailDetailOpen(true);
  };

  const emailActivityLine = (row: EmailRow) => {
    if (row.status === "failed") {
      return `Failed to send email to ${row.to_email} — ${row.subject}`;
    }
    return `Email sent to ${row.to_email} — ${row.subject}`;
  };

  const renderLogTable = (
    rows: ActivityRow[] | EmailRow[],
    emptyMessage: string,
    renderActivity: (row: ActivityRow | EmailRow) => ReactNode,
    onView: (row: ActivityRow | EmailRow) => void
  ) => (
    <div className="rounded-md border border-sky-100 dark:border-sky-900 overflow-auto max-h-[55vh]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-sky-100/90 dark:bg-sky-950/50 border-b border-sky-200 dark:border-sky-800">
            <th className="text-left py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">
              Date &amp; time
            </th>
            <th className="text-left py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">Activity</th>
            <th className="text-left py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">Action</th>
          </tr>
        </thead>
        <tbody>
          {!hasLoaded ? null : rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-10 px-4 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const { date, time } = formatDateTimeCell(row.created_at);
              return (
                <tr key={row.id} className="border-b border-border bg-background hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                  <td className="py-3 px-4 align-top text-slate-800 dark:text-slate-100">
                    <div className="font-medium">{date}</div>
                    <div className="text-muted-foreground text-xs mt-0.5">{time}</div>
                  </td>
                  <td className="py-3 px-4 align-top text-slate-800 dark:text-slate-100">{renderActivity(row)}</td>
                  <td className="py-3 px-4 align-top">
                    <button
                      type="button"
                      onClick={() => onView(row)}
                      className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-slate-200",
            "[&>button]:text-red-600 [&>button]:hover:text-red-700"
          )}
        >
          <DialogHeader className="px-6 py-4 shrink-0 bg-sky-50 dark:bg-sky-950/40 border-b border-sky-100 dark:border-sky-900">
            <DialogTitle className="text-left text-lg font-bold text-slate-900 dark:text-slate-100">
              Logs
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pt-2 pb-4 flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "booking" | "email")} className="flex flex-col flex-1 min-h-0">
              <TabsList className="h-auto p-0 bg-transparent border-b border-border rounded-none w-full justify-start gap-0">
                <TabsTrigger
                  value="booking"
                  className="rounded-none border-0 border-t-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-muted/60 data-[state=active]:shadow-none px-4 py-2.5 text-slate-700 dark:text-slate-200"
                >
                  Booking logs
                </TabsTrigger>
                <TabsTrigger
                  value="email"
                  className="rounded-none border-0 border-t-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-muted/60 data-[state=active]:shadow-none px-4 py-2.5 text-slate-700 dark:text-slate-200"
                >
                  Email logs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="booking" className="flex-1 min-h-0 mt-0 pt-4 data-[state=inactive]:hidden">
                {fetchNote && (
                  <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-md px-3 py-2 mb-2">
                    {fetchNote}
                  </p>
                )}
                {loadError && <p className="text-sm text-destructive mb-2">{loadError}</p>}
                {renderLogTable(
                  bookingLogs,
                  "No booking activity logged yet for this booking.",
                  (row) => (
                    <ActivityWithBoldName
                      text={(row as ActivityRow).activity_text}
                      actorName={(row as ActivityRow).actor_name}
                    />
                  ),
                  (row) => openBookingLogDetail(row as ActivityRow)
                )}
              </TabsContent>

              <TabsContent value="email" className="flex-1 min-h-0 mt-0 pt-4 data-[state=inactive]:hidden">
                {fetchNote && (
                  <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-md px-3 py-2 mb-2">
                    {fetchNote}
                  </p>
                )}
                {loadError && <p className="text-sm text-destructive mb-2">{loadError}</p>}
                {renderLogTable(
                  emailLogs,
                  "No emails logged yet for this booking.",
                  (row) => emailActivityLine(row as EmailRow),
                  (row) => openEmailDetail(row as EmailRow)
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <BookingLogDetailDialog
        open={detailOpen}
        onOpenChange={(o) => {
          setDetailOpen(o);
          if (!o) {
            setDetailLogId(null);
            setDetailLogPreview(null);
          }
        }}
        bookingId={bookingId}
        logId={detailLogId}
        businessId={businessId}
        previewLog={detailLogPreview}
      />

      <Dialog open={emailDetailOpen} onOpenChange={setEmailDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-left">Email log detail</DialogTitle>
          </DialogHeader>
          <pre className="text-sm whitespace-pre-wrap text-muted-foreground font-sans">{emailDetailBody}</pre>
          <Button type="button" variant="outline" onClick={() => setEmailDetailOpen(false)} className="mt-2">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
