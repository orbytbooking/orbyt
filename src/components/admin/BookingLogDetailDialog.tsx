"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BOOKING_LOG_DETAIL_PRIMARY_FIELDS,
  formatSnapshotValue,
  snapshotFieldChanged,
  snapshotHasAnyData,
  snapshotHasPreviousChanges,
  type BookingLogMetadata,
  type BookingLogSnapshot,
} from "@/lib/bookingLogSnapshot";
import { shortBookingRefForLogs } from "@/lib/draftQuoteLogs";
import { cn } from "@/lib/utils";

type LogDetail = {
  id: string;
  booking_id: string;
  created_at: string;
  activity_text: string;
  actor_name: string | null;
  event_key: string | null;
  metadata: BookingLogMetadata | null;
};

type RecurringRef = { id: string; ref: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string | null;
  logId: string | null;
  businessId: string;
  previewLog?: {
    id: string;
    created_at: string;
    activity_text: string;
    actor_name: string | null;
    event_key: string | null;
  } | null;
};

function formatLogWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return format(d, "MM/dd/yyyy hh:mm a").toLowerCase();
  } catch {
    return "";
  }
}

function HeadlineText({ text }: { text: string }) {
  const match = text.match(/^(\#\w+)\s*-\s*(.*)$/i);
  if (!match) return <span>{text}</span>;
  return (
    <>
      <span className="font-semibold text-sky-600 dark:text-sky-400">{match[1]}</span>
      <span> - {match[2]}</span>
    </>
  );
}

function DetailCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded border",
        checked ? "border-sky-500 bg-sky-500 text-white" : "border-slate-300 bg-white dark:bg-slate-900"
      )}
    >
      {checked ? <Check className="h-3.5 w-3.5" /> : null}
    </span>
  );
}

function DetailValue({
  fieldKey,
  formatType,
  value,
  changed,
}: {
  fieldKey: keyof BookingLogSnapshot;
  formatType?: "checkbox" | "text";
  value: string | boolean | null | undefined;
  changed?: boolean;
}) {
  if (formatType === "checkbox") {
    return (
      <div className={cn("flex justify-end", changed && "rounded-md bg-sky-100/90 dark:bg-sky-950/50 px-2 py-1")}>
        <DetailCheckbox checked={value === true} />
      </div>
    );
  }
  return (
    <span
      className={cn(
        "text-right text-slate-700 dark:text-slate-200 break-words",
        changed && "rounded-md bg-sky-100/90 dark:bg-sky-950/50 px-2 py-1 font-medium text-sky-900 dark:text-sky-100"
      )}
    >
      {formatSnapshotValue(fieldKey, value, formatType)}
    </span>
  );
}

export function BookingLogDetailDialog({
  open,
  onOpenChange,
  bookingId,
  logId,
  businessId,
  previewLog,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [log, setLog] = useState<LogDetail | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringRefs, setRecurringRefs] = useState<RecurringRef[]>([]);

  const load = useCallback(async () => {
    if (!bookingId || !logId || !businessId) {
      setLoading(false);
      if (!businessId) {
        setLoadError("Business context is missing. Select a business and try again.");
      }
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/admin/bookings/${encodeURIComponent(bookingId)}/logs/${encodeURIComponent(logId)}`,
        {
          credentials: "include",
          headers: { "x-business-id": businessId },
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(typeof data.error === "string" ? data.error : "Failed to load log detail.");
        setLog(null);
        setIsRecurring(false);
        setRecurringRefs([]);
        return;
      }
      setLog(data.log ?? null);
      setIsRecurring(data.isRecurring === true);
      setRecurringRefs(Array.isArray(data.recurringBookingRefs) ? data.recurringBookingRefs : []);
    } catch {
      setLoadError("Network error.");
      setLog(null);
      setIsRecurring(false);
      setRecurringRefs([]);
    } finally {
      setLoading(false);
    }
  }, [bookingId, logId, businessId]);

  useEffect(() => {
    if (open && bookingId && logId) void load();
  }, [open, bookingId, logId, load]);

  useEffect(() => {
    if (!open) {
      setLog(null);
      setIsRecurring(false);
      setRecurringRefs([]);
      setLoadError(null);
    }
  }, [open]);

  const displayLog =
    log ??
    (previewLog && previewLog.id === logId
      ? {
          id: previewLog.id,
          booking_id: bookingId ?? "",
          created_at: previewLog.created_at,
          activity_text: previewLog.activity_text,
          actor_name: previewLog.actor_name,
          event_key: previewLog.event_key,
          metadata: null,
        }
      : null);

  const metadata = displayLog?.metadata;
  const current = metadata?.current ?? null;
  const previous = metadata?.previous ?? null;
  const hasSummary = snapshotHasAnyData(current);
  const hasChanges = snapshotHasPreviousChanges(current, previous);

  const whenSuffix = displayLog ? formatLogWhen(displayLog.created_at) : "";
  const activityCore = displayLog?.activity_text ?? "";
  const headline = activityCore
    ? `${activityCore}${whenSuffix ? ` on ${whenSuffix}` : ""}`
    : "";

  const highlightedRef = displayLog?.booking_id
    ? shortBookingRefForLogs(displayLog.booking_id)
    : null;

  const primaryRows = BOOKING_LOG_DETAIL_PRIMARY_FIELDS;

  const showRecurringHistory =
    isRecurring && Boolean(metadata?.recurring_series_id) && recurringRefs.length > 0;

  const renderDetailRows = (
    fields: typeof BOOKING_LOG_DETAIL_PRIMARY_FIELDS,
    keyPrefix: string
  ) =>
    fields.map((field) => {
      const changed = hasChanges && snapshotFieldChanged(field.key, current, previous, field.format);
      return (
        <div
          key={`${keyPrefix}-${field.key}`}
          className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-4 items-start py-2.5"
        >
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{field.label}</div>
          <DetailValue
            fieldKey={field.key}
            formatType={field.format}
            value={current?.[field.key]}
            changed={changed}
          />
        </div>
      );
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden border-slate-200",
          "[&>button]:text-red-600 [&>button]:hover:text-red-700"
        )}
      >
        <DialogTitle className="sr-only">Booking log detail</DialogTitle>
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background shrink-0">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed pr-2">
              <HeadlineText text={headline} />
            </p>
            {bookingId && (
              <Button
                asChild
                size="sm"
                className="shrink-0 bg-sky-500 hover:bg-sky-600 text-white"
              >
                <Link href={`/admin/bookings?booking=${encodeURIComponent(bookingId)}`}>
                  View Booking
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6 bg-white dark:bg-background">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading…
            </div>
          ) : loadError && !displayLog ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : !displayLog ? (
            <p className="text-sm text-muted-foreground">Log entry not found.</p>
          ) : (
            <>
              {loadError && (
                <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-md px-3 py-2">
                  {loadError}
                </p>
              )}

              <section>
                {hasSummary ? (
                  <>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
                      Booking details
                    </h3>
                    <div className="space-y-1">{renderDetailRows(primaryRows, "primary")}</div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground rounded-md border border-dashed border-slate-300 dark:border-slate-700 px-4 py-8 text-center">
                    Booking details could not be loaded for this log entry.
                  </p>
                )}
              </section>

              {showRecurringHistory && (
                <section className="pt-6 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
                    Booking addition history
                  </h3>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Recurring booking ids
                    </p>
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      {recurringRefs.map((item, index) => {
                        const active = item.ref === highlightedRef;
                        return (
                          <span key={item.id}>
                            {index > 0 ? ", " : null}
                            <Link
                              href={`/admin/bookings?booking=${encodeURIComponent(item.id)}`}
                              className={cn(
                                active
                                  ? "inline-flex items-center rounded bg-sky-500 px-1.5 py-0.5 font-medium text-white no-underline hover:bg-sky-600"
                                  : "text-sky-700 dark:text-sky-300 hover:underline"
                              )}
                            >
                              #{item.ref}
                            </Link>
                          </span>
                        );
                      })}
                    </p>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
