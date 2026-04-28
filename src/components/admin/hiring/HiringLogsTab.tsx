"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useBusiness } from "@/contexts/BusinessContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

type LogKind = "system" | "email" | "sms";

type SystemLog = {
  id: string;
  createdAt: string;
  kind: string;
  summary: string;
  prospectName: string;
  prospectEmail: string;
};

type EmailLog = {
  id: string;
  createdAt: string;
  emailType: "quiz" | "contract";
  formName: string;
  prospectName: string;
  prospectEmail: string;
};

type SmsLog = {
  id: string;
  createdAt: string;
  kind: string;
  summary: string;
  prospectName: string;
  prospectEmail: string;
};

type LogsPayload = {
  systemLogs: SystemLog[];
  emailLogs: EmailLog[];
  smsLogs: SmsLog[];
};

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown time";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function HiringLogsTab() {
  const searchParams = useSearchParams();
  const { currentBusiness } = useBusiness();
  const [active, setActive] = useState<LogKind>(() => {
    const v = searchParams.get("logsView");
    if (v === "email" || v === "sms" || v === "system") return v;
    return "system";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LogsPayload>({
    systemLogs: [],
    emailLogs: [],
    smsLogs: [],
  });

  useEffect(() => {
    const v = searchParams.get("logsView");
    if (v === "email" || v === "sms" || v === "system") {
      setActive(v);
    }
  }, [searchParams]);

  useEffect(() => {
    const businessId = currentBusiness?.id;
    if (!businessId) {
      setData({ systemLogs: [], emailLogs: [], smsLogs: [] });
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch("/api/admin/hiring/logs", {
          credentials: "include",
          headers: { "x-business-id": businessId },
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string } & Partial<LogsPayload>;
        if (!res.ok) throw new Error(json.error || "Could not load hiring logs");
        if (cancelled) return;
        setData({
          systemLogs: Array.isArray(json.systemLogs) ? json.systemLogs : [],
          emailLogs: Array.isArray(json.emailLogs) ? json.emailLogs : [],
          smsLogs: Array.isArray(json.smsLogs) ? json.smsLogs : [],
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load hiring logs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentBusiness?.id]);

  const currentLabel = active === "email" ? "Email logs" : active === "sms" ? "SMS logs" : "System logs";
  const currentLogs = useMemo(() => {
    if (active === "email") return data.emailLogs;
    if (active === "sms") return data.smsLogs;
    return data.systemLogs;
  }, [active, data]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Logs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review hiring activity by channel: system logs, email logs, and SMS logs.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Hiring logs
          </CardTitle>
          <CardDescription>Showing latest events for the selected business.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!currentBusiness?.id ? (
            <p className="text-sm text-muted-foreground">Select a business to view hiring logs.</p>
          ) : (
            <>
              <div className="text-sm font-medium text-slate-900">{currentLabel}</div>

              {loading ? <p className="text-sm text-muted-foreground">Loading logs…</p> : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              {!loading && !error ? (
                currentLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {active === "email"
                      ? "No email logs yet."
                      : active === "sms"
                        ? "No SMS logs yet. SMS entries appear when hiring activities include SMS events."
                        : "No system logs yet."}
                  </p>
                ) : (
                  <div className="divide-y rounded-md border bg-white">
                    {active === "email"
                      ? (currentLogs as EmailLog[]).map((log) => (
                          <div key={log.id} className="p-3 text-sm">
                            <div className="font-medium text-slate-900">
                              {log.emailType === "quiz" ? "Quiz invite sent" : "Contract invite sent"} — {log.formName}
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {log.prospectName}
                              {log.prospectEmail ? ` • ${log.prospectEmail}` : ""} • {fmtDateTime(log.createdAt)}
                            </div>
                          </div>
                        ))
                      : (currentLogs as Array<SystemLog | SmsLog>).map((log) => (
                          <div key={log.id} className="p-3 text-sm">
                            <div className="font-medium text-slate-900">{log.summary}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {log.prospectName}
                              {log.prospectEmail ? ` • ${log.prospectEmail}` : ""} • {fmtDateTime(log.createdAt)} •{" "}
                              {log.kind}
                            </div>
                          </div>
                        ))}
                  </div>
                )
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
