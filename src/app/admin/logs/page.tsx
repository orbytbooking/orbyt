"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ExternalLink, Link2, List, Loader2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBusiness } from "@/contexts/BusinessContext";
import type { UnifiedActorType, UnifiedLogEntry } from "@/lib/adminBusinessLogs";
import { shortBookingRefForLogs } from "@/lib/draftQuoteLogs";
import { cn } from "@/lib/utils";

function kindLabel(kind: string): string {
  const map: Record<string, string> = {
    quote_activity: "Quote activity",
    quote_email: "Quote email",
    provider_payment: "Provider payout",
    admin_notification: "Alert",
    assignment: "Assignment",
    time_log: "Time clock",
    hiring: "Hiring",
    lead: "Lead",
    support_ticket: "Support",
    customer: "Customer",
  };
  return map[kind] || kind.replace(/_/g, " ");
}

function actorBadgeClass(actor: UnifiedActorType): string {
  switch (actor) {
    case "admin":
      return "border-violet-300 text-violet-800 dark:text-violet-200";
    case "provider":
      return "border-sky-300 text-sky-800 dark:text-sky-200";
    case "customer":
      return "border-emerald-300 text-emerald-800 dark:text-emerald-200";
    default:
      return "border-slate-300 text-slate-700 dark:text-slate-300";
  }
}

export default function LogsPage() {
  const { currentBusiness, loading: businessLoading, hasModuleAccess } = useBusiness();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId =
    searchParams.get("bookingId")?.trim() ||
    searchParams.get("booking")?.trim() ||
    null;

  const [entries, setEntries] = useState<UnifiedLogEntry[]>([]);
  const [fetchNote, setFetchNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<"all" | UnifiedActorType>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");

  const canView = hasModuleAccess("logs");

  const load = useCallback(async () => {
    if (!currentBusiness?.id || !canView) return;
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (bookingId) params.set("booking", bookingId);
      const res = await fetch(`/api/admin/logs?${params.toString()}`, {
        credentials: "include",
        headers: { "x-business-id": currentBusiness.id },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(typeof data.error === "string" ? data.error : "Failed to load logs.");
        setEntries([]);
        return;
      }
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setFetchNote(typeof data.fetchNote === "string" ? data.fetchNote : null);
    } catch {
      setLoadError("Network error.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, bookingId, canView]);

  useEffect(() => {
    void load();
  }, [load]);

  const moduleOptions = useMemo(() => {
    const s = new Set(entries.map((e) => e.source_module));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const kindOptions = useMemo(() => {
    const s = new Set(entries.map((e) => e.kind));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((row) => {
      if (kindFilter !== "all" && row.kind !== kindFilter) return false;
      if (actorFilter !== "all" && row.actor_type !== actorFilter) return false;
      if (moduleFilter !== "all" && row.source_module !== moduleFilter) return false;
      if (!q) return true;
      const bid = row.booking_id;
      const ref = bid ? shortBookingRefForLogs(bid).toLowerCase() : "";
      const idMatch = bid ? bid.toLowerCase().includes(q) : false;
      return (
        idMatch ||
        (ref && ref.includes(q)) ||
        row.summary.toLowerCase().includes(q) ||
        (row.actor_name?.toLowerCase().includes(q) ?? false) ||
        (row.email_to?.toLowerCase().includes(q) ?? false) ||
        row.source_module.toLowerCase().includes(q)
      );
    });
  }, [entries, search, kindFilter, actorFilter, moduleFilter]);

  const clearBookingFilter = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("booking");
    next.delete("bookingId");
    router.replace(`/admin/logs${next.toString() ? `?${next}` : ""}`);
  };

  const formatWhen = (iso: string) => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "—";
      return `${format(d, "MM/dd/yyyy")} · ${format(d, "hh:mm a")}`;
    } catch {
      return "—";
    }
  };

  if (businessLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!currentBusiness) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
          <CardDescription>Select a business to view activity.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
          <CardDescription>You do not have access to this module.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-primary" />
            <CardTitle>Logs</CardTitle>
          </div>
          <CardDescription>
            Unified activity for this business: admin alerts, bookings, quotes, provider payouts and time clock,
            plus hiring, leads, customers, and support tickets when those tables are in use.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bookingId && (
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200/80",
                "bg-sky-50/80 dark:bg-sky-950/30 dark:border-sky-900/60 px-4 py-3"
              )}
            >
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Filtered by booking</p>
                <p className="font-mono text-xs break-all text-muted-foreground">{bookingId}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/bookings?booking=${encodeURIComponent(bookingId)}`}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Open in Bookings
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={clearBookingFilter}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear filter
                </Button>
              </div>
            </div>
          )}

          {fetchNote && (
            <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-md px-3 py-2">
              {fetchNote}
            </p>
          )}

          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <Input
              placeholder="Search summary, module, booking, actor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="lg:max-w-xs xl:max-w-sm"
            />
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="lg:w-[200px]">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {moduleOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger className="lg:w-[200px]">
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All event types</SelectItem>
                {kindOptions.map((k) => (
                  <SelectItem key={k} value={k}>
                    {kindLabel(k)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actorFilter} onValueChange={(v) => setActorFilter(v as typeof actorFilter)}>
              <SelectTrigger className="lg:w-[160px]">
                <SelectValue placeholder="Actor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actors</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="provider">Provider</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>

          {loadError && (
            <p className="text-sm text-destructive">{loadError}</p>
          )}

          <div className="rounded-md border border-border/60 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">When</TableHead>
                  <TableHead className="whitespace-nowrap">Module</TableHead>
                  <TableHead className="whitespace-nowrap">Actor</TableHead>
                  <TableHead className="whitespace-nowrap">Event</TableHead>
                  <TableHead className="whitespace-nowrap">Booking</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead className="whitespace-nowrap w-[1%]"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin inline-block mr-2 align-middle" />
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                      {entries.length === 0
                        ? "No activity in range yet, or some data sources are still empty."
                        : "No entries match your filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="align-top text-sm whitespace-nowrap text-muted-foreground">
                        {formatWhen(row.created_at)}
                      </TableCell>
                      <TableCell className="align-top text-sm max-w-[140px]">
                        <span className="line-clamp-2" title={row.source_module}>
                          {row.source_module}
                        </span>
                      </TableCell>
                      <TableCell className="align-top whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <Badge
                            variant="outline"
                            className={cn("font-normal w-fit capitalize", actorBadgeClass(row.actor_type))}
                          >
                            {row.actor_type}
                          </Badge>
                          {row.actor_name && (
                            <span className="text-xs text-muted-foreground max-w-[120px] truncate" title={row.actor_name}>
                              {row.actor_name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top whitespace-nowrap">
                        <Badge variant="secondary" className="font-normal">
                          {kindLabel(row.kind)}
                        </Badge>
                        {row.email_status === "failed" && (
                          <span className="ml-1 text-xs text-destructive font-medium">Failed</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {row.booking_id ? (
                          <Button variant="link" className="h-auto p-0 font-mono text-xs" asChild>
                            <Link href={`/admin/logs?booking=${encodeURIComponent(row.booking_id)}`}>
                              #{shortBookingRefForLogs(row.booking_id)}
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-sm max-w-[min(420px,40vw)]">
                        <span className="break-words">{row.summary}</span>
                        {row.ip_address && (
                          <span className="block text-xs text-muted-foreground mt-1">
                            IP {row.ip_address}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {row.link ? (
                          row.link.startsWith("http://") || row.link.startsWith("https://") ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild title="Open link">
                              <a href={row.link} target="_blank" rel="noopener noreferrer">
                                <Link2 className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild title="Open related page">
                              <Link href={row.link.startsWith("/") ? row.link : `/${row.link}`}>
                                <Link2 className="h-4 w-4" />
                              </Link>
                            </Button>
                          )
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
