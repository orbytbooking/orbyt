"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  LayoutDashboard,
  List,
  MapPin,
  Search,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BookingsTable } from "@/components/customer/BookingsTable";
import { CustomerBookingPaymentSummary } from "@/components/customer/CustomerBookingPaymentSummary";
import { CustomerSidebar } from "@/components/customer/CustomerSidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCustomerBookings } from "@/hooks/useCustomerBookings";
import { useCustomerAccount } from "@/hooks/useCustomerAccount";
import { Booking } from "@/lib/customer-bookings";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { getSupabaseCustomerClient } from "@/lib/supabaseCustomerClient";
import { resolveBookingDurationMinutes } from "@/lib/bookingDuration";
import { cn } from "@/lib/utils";

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
};
const formatTime = (timeStr: string) => {
  if (!timeStr || typeof timeStr !== "string") return timeStr;
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return timeStr;
  const h = parseInt(m[1], 10);
  const min = m[2] || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${min} ${ampm}`;
};
const formatCurrency = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);

function formatLengthLabel(totalMinutes: number): string {
  const m = Math.round(totalMinutes);
  if (!Number.isFinite(m) || m <= 0) return "—";
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest > 0 ? `${h} Hr ${rest} Min` : `${h} Hr`;
  }
  return `${m} Min`;
}

const statusStyles: Record<string, string> = {
  scheduled: "bg-muted text-muted-foreground",
  confirmed: "bg-muted text-muted-foreground",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  canceled: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
};
const statusLabels: Record<string, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  canceled: "Canceled",
  cancelled: "Canceled",
};

const DEFAULT_SELF_CANCEL_BLOCKED_HTML = "<p>Please contact admin to cancel your booking.</p>";

const CustomerAppointmentsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams?.get("business") ?? "";
  const { bookings, loading: bookingsLoading, updateBookings, refreshBookings } = useCustomerBookings();
  const { customerName, customerEmail, customerAccount, handleLogout } = useCustomerAccount();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [detailsBooking, setDetailsBooking] = useState<Booking | null>(null);
  const [cancelDialogBooking, setCancelDialogBooking] = useState<Booking | null>(null);
  const [cancellationDisclaimer, setCancellationDisclaimer] = useState<string | null>(null);
  const [cancellationPolicyLoading, setCancellationPolicyLoading] = useState(false);
  const [detailsCancellationDisclaimer, setDetailsCancellationDisclaimer] = useState<string | null>(null);
  const [rescheduleSettingsLoading, setRescheduleSettingsLoading] = useState(false);
  const [selfCancelAllowed, setSelfCancelAllowed] = useState<boolean | null>(null);
  const [selfCancelBlockedMessageHtml, setSelfCancelBlockedMessageHtml] = useState(DEFAULT_SELF_CANCEL_BLOCKED_HTML);
  const [cancelBlockedBooking, setCancelBlockedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!businessId) {
      setSelfCancelAllowed(null);
      setSelfCancelBlockedMessageHtml(DEFAULT_SELF_CANCEL_BLOCKED_HTML);
      return;
    }
    let cancelled = false;
    fetch(`/api/customer/cancellation-settings?businessId=${encodeURIComponent(businessId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || data.error) return;
        setSelfCancelAllowed(data.allow_customer_self_cancel !== false);
        if (typeof data.customer_self_cancel_blocked_message === "string") {
          setSelfCancelBlockedMessageHtml(data.customer_self_cancel_blocked_message);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && businessId) void refreshBookings();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [businessId, refreshBookings]);

  const upcomingBookings = useMemo(
    () => bookings.filter((b) => !["completed", "canceled", "cancelled"].includes(b.status?.toLowerCase() ?? "")),
    [bookings],
  );

  const sortedBookings = useMemo(
    () =>
      [...upcomingBookings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [upcomingBookings],
  );

  const filteredBookings = useMemo(() => {
    if (!search.trim()) return sortedBookings;
    const term = search.toLowerCase();
    return sortedBookings.filter(
      (booking) =>
        booking.service.toLowerCase().includes(term) ||
        booking.provider.toLowerCase().includes(term) ||
        booking.address.toLowerCase().includes(term) ||
        booking.id.toLowerCase().includes(term),
    );
  }, [sortedBookings, search]);

  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const bookingsByDate = useMemo(() => {
    return filteredBookings.reduce<Record<string, Booking[]>>((acc, booking) => {
      const key = booking?.date;
      if (!key) return acc;
      acc[key] = acc[key] ? [...acc[key], booking] : [booking];
      return acc;
    }, {});
  }, [filteredBookings]);

  const calendarDays = useMemo(() => {
    const startDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const endDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);

    const calendarStart = new Date(startDate);
    calendarStart.setDate(startDate.getDate() - startDate.getDay());

    const calendarEnd = new Date(endDate);
    calendarEnd.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const today = new Date().toDateString();
    const days: { date: Date; iso: string; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const current = new Date(calendarStart);

    while (current <= calendarEnd) {
      const iso = formatDateKey(current);
      days.push({
        date: new Date(current),
        iso,
        isCurrentMonth: current.getMonth() === calendarMonth.getMonth(),
        isToday: current.toDateString() === today,
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [calendarMonth]);

  const calendarMonthLabel = useMemo(
    () => calendarMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    [calendarMonth],
  );

  useEffect(() => {
    if (sortedBookings.length === 0) return;
    const earliest = new Date(sortedBookings[0].date);
    setCalendarMonth((prev) => {
      if (prev.getFullYear() === earliest.getFullYear() && prev.getMonth() === earliest.getMonth()) {
        return prev;
      }
      return new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    });
  }, [sortedBookings]);

  const firstName = customerName.split(" ")[0] || "Customer";
  const initials = useMemo(() => (
    customerName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "PP"
  ), [customerName]);

  const handleCancelBookingClick = async (booking: Booking) => {
    if (businessId) {
      let allowed = selfCancelAllowed;
      if (allowed === null) {
        try {
          const res = await fetch(
            `/api/customer/cancellation-settings?businessId=${encodeURIComponent(businessId)}`
          );
          const data = await res.json().catch(() => ({}));
          if (!res.ok || data.error) {
            allowed = true;
          } else {
            allowed = data.allow_customer_self_cancel !== false;
            if (typeof data.customer_self_cancel_blocked_message === "string") {
              setSelfCancelBlockedMessageHtml(data.customer_self_cancel_blocked_message);
            }
            setSelfCancelAllowed(allowed);
          }
        } catch {
          allowed = true;
        }
      }
      if (allowed === false) {
        setCancelBlockedBooking(booking);
        return;
      }
    }
    setCancelDialogBooking(booking);
    setCancellationDisclaimer(null);
    if (businessId) {
      setCancellationPolicyLoading(true);
      fetch(`/api/cancellation-policy?businessId=${encodeURIComponent(businessId)}`)
        .then((r) => r.json())
        .then((data) => setCancellationDisclaimer(data.disclaimerText ?? "Based on our cancellation policy, fees may apply when you cancel."))
        .catch(() => setCancellationDisclaimer("Based on our cancellation policy, fees may apply when you cancel."))
        .finally(() => setCancellationPolicyLoading(false));
    } else {
      setCancellationDisclaimer("Based on our cancellation policy, fees may apply when you cancel.");
    }
  };

  const handleCancelBookingConfirm = async () => {
    const booking = cancelDialogBooking;
    if (!booking) return;
    setCancelDialogBooking(null);
    setCancellingId(`${booking.id}|${booking.occurrenceDate ?? ""}`);
    try {
      const supabase = getSupabaseCustomerClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Cannot cancel",
          description: "Please log in again to cancel bookings.",
          variant: "destructive",
        });
        return;
      }
      const res = await fetch(`/api/customer/bookings/${encodeURIComponent(booking.id)}?business=${encodeURIComponent(businessId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          status: "canceled",
          ...(booking.occurrenceDate ? { occurrence_date: booking.occurrenceDate } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({
          title: "Cancel failed",
          description: err?.error ?? `Failed to cancel booking (${res.status})`,
          variant: "destructive",
        });
        return;
      }
      updateBookings((prev) =>
        prev.map((item) => {
          const sameRow =
            item.id === booking.id &&
            (item.occurrenceDate ?? "") === (booking.occurrenceDate ?? "");
          return sameRow ? { ...item, status: "canceled" } : item;
        }),
      );
      toast({
        title: "Booking canceled",
        description: "Your appointment has been canceled.",
      });
    } catch (e) {
      console.error("Cancel booking error", e);
      toast({
        title: "Cancel failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCancellingId(null);
    }
  };

  const handleViewDetails = (booking: Booking) => {
    setDetailsBooking(booking);
    setDetailsCancellationDisclaimer(null);
    if (businessId) {
      fetch(`/api/cancellation-policy?businessId=${encodeURIComponent(businessId)}`)
        .then((r) => r.json())
        .then((data) => setDetailsCancellationDisclaimer(data.disclaimerText ?? null))
        .catch(() => setDetailsCancellationDisclaimer(null));
    }
  };

  const handleEditReschedule = async (booking: Booking) => {
    if (!businessId) {
      const params = new URLSearchParams({ bookingId: booking.id });
      router.push(`/book-now?${params.toString()}`);
      return;
    }
    setRescheduleSettingsLoading(true);
    try {
      const res = await fetch(`/api/customer/reschedule-settings?businessId=${encodeURIComponent(businessId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        router.push(`/book-now?${new URLSearchParams({ bookingId: booking.id, business: businessId }).toString()}`);
        return;
      }
      const params = new URLSearchParams({ bookingId: booking.id, business: businessId });
      if (data.allow_customer_self_reschedule) {
        router.push(`/book-now?${params.toString()}`);
        return;
      }
      // Booking Koala-style: when self-reschedule is off, go to limited edit (customer details + payment only)
      params.set("editOnly", "details-payment");
      router.push(`/book-now?${params.toString()}`);
    } catch {
      const params = new URLSearchParams({ bookingId: booking.id, business: businessId });
      router.push(`/book-now?${params.toString()}`);
    } finally {
      setRescheduleSettingsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[280px_1fr]">
        <CustomerSidebar
          customerName={customerName}
          customerEmail={customerEmail}
          initials={initials}
          businessName={customerAccount?.businessName || ''}
          onLogout={handleLogout}
        />
        <div className="order-1 flex flex-col lg:order-2">
          <header className="bg-background border-b border-border shadow-sm">
            <div className="flex flex-col px-6 py-5 gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
              <p className="text-sm text-muted-foreground">
                Manage your bookings, reschedule, or cancel upcoming services.
              </p>
            </div>
          </header>
          <main className="flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] max-w-md flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search bookings by service, provider, location, or ID"
                    className="pl-9"
                  />
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant={viewMode === "calendar" ? "default" : "outline"}
                    size="icon"
                    className={cn(
                      "h-10 w-10 shrink-0 rounded-lg",
                      viewMode === "calendar"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-background text-foreground",
                    )}
                    title="Calendar view"
                    aria-pressed={viewMode === "calendar"}
                    onClick={() => setViewMode("calendar")}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="icon"
                    className={cn(
                      "h-10 w-10 shrink-0 rounded-lg",
                      viewMode === "list"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-background text-foreground",
                    )}
                    title="List view"
                    aria-pressed={viewMode === "list"}
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button asChild className="shrink-0">
                <Link href={businessId ? `/book-now?business=${businessId}` : "/book-now"}>
                  Book a new appointment
                </Link>
              </Button>
            </div>

            {bookingsLoading ? (
              <div className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex gap-3 border-b border-border pb-4">
                  <Skeleton className="h-4 flex-1 max-w-[140px]" />
                  <Skeleton className="h-4 flex-1 max-w-[120px]" />
                  <Skeleton className="h-4 flex-1 max-w-[100px]" />
                  <Skeleton className="h-4 flex-1 max-w-[80px]" />
                  <Skeleton className="h-4 w-20 ml-auto shrink-0" />
                </div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : viewMode === "list" ? (
              <BookingsTable
                bookings={filteredBookings}
                emptyMessage="No appointments yet. Schedule your first service to get started."
                onCancelBooking={handleCancelBookingClick}
                onViewDetails={handleViewDetails}
                onEditReschedule={handleEditReschedule}
              />
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold">{calendarMonthLabel}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        aria-label="Next month"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-7 text-xs font-semibold text-muted-foreground">
                    {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((label) => (
                      <div key={label} className="text-center py-2">
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2 text-sm">
                    {calendarDays.map((day) => {
                      const events = bookingsByDate[day.iso] ?? [];
                      return (
                        <div
                          key={day.iso}
                          className={cn(
                            "rounded-2xl border p-2 min-h-[120px] flex flex-col gap-1 transition",
                            day.isCurrentMonth ? "bg-background" : "bg-muted/60",
                            day.isToday && "ring-2 ring-primary",
                          )}
                        >
                          <div
                            className={cn(
                              "flex items-center justify-between text-xs font-semibold",
                              day.isCurrentMonth ? "text-foreground" : "text-muted-foreground",
                            )}
                          >
                            <span>{day.date.getDate()}</span>
                            {events.length > 0 && (
                              <span className="text-[10px] text-primary font-medium">{events.length}×</span>
                            )}
                          </div>
                          <div className="space-y-1 overflow-y-auto max-h-[200px]">
                            {events.map((event, idx) => {
                              const st = event.status?.toLowerCase() ?? "";
                              const chipClass =
                                st === "completed"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : st === "canceled" || st === "cancelled"
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                                    : st === "in_progress"
                                      ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                                      : "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300";
                              return (
                                <button
                                  key={`${event.id}-${event.occurrenceDate ?? event.date}-${event.time}-${idx}`}
                                  type="button"
                                  onClick={() => handleViewDetails(event)}
                                  className={cn(
                                    "w-full rounded-xl px-2 py-1 text-left text-[11px] font-medium transition hover:opacity-90",
                                    chipClass,
                                  )}
                                >
                                  <p className="truncate">{formatTime(event.time)}</p>
                                  <p className="truncate text-[10px] font-semibold">{event.service}</p>
                                  <p className="text-[10px] font-medium text-muted-foreground/90 truncate">{event.provider}</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {filteredBookings.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground">
                      No appointments yet. Schedule your first service to get started.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Dialog open={!!cancelDialogBooking} onOpenChange={(open) => !open && setCancelDialogBooking(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Cancel booking</DialogTitle>
                </DialogHeader>
                {cancelDialogBooking && (
                  <div className="space-y-4 py-2">
                    <p className="text-sm text-muted-foreground">
                      Are you sure you want to cancel <span className="font-medium text-foreground">{cancelDialogBooking.service}</span>?
                    </p>
                    <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                      {cancellationPolicyLoading ? (
                        <p className="text-muted-foreground">Loading cancellation disclaimer...</p>
                      ) : (
                        <p className="text-muted-foreground">
                          {cancellationDisclaimer ?? "Based on our cancellation policy, fees may apply when you cancel."}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setCancelDialogBooking(null)}>
                        Keep booking
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleCancelBookingConfirm}
                        disabled={cancellingId === `${cancelDialogBooking.id}|${cancelDialogBooking.occurrenceDate ?? ""}`}
                      >
                        {cancellingId === `${cancelDialogBooking.id}|${cancelDialogBooking.occurrenceDate ?? ""}`
                          ? "Canceling…"
                          : "Cancel booking"}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={!!cancelBlockedBooking} onOpenChange={(open) => !open && setCancelBlockedBooking(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Unable to cancel online</DialogTitle>
                </DialogHeader>
                {cancelBlockedBooking && (
                  <div className="space-y-4 py-2">
                    <p className="text-sm text-muted-foreground">
                      Online cancellation is turned off for this business. You can still view your appointment details below.
                    </p>
                    <div
                      className="rounded-lg border bg-muted/50 p-4 text-sm prose prose-sm max-w-none dark:prose-invert [&_a]:text-primary"
                      dangerouslySetInnerHTML={{ __html: selfCancelBlockedMessageHtml }}
                    />
                    <div className="flex justify-end pt-2">
                      <Button variant="outline" onClick={() => setCancelBlockedBooking(null)}>
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={!!detailsBooking} onOpenChange={(open) => !open && setDetailsBooking(null)}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Booking details</DialogTitle>
                </DialogHeader>
                {detailsBooking && (
                  <div className="space-y-6 py-2">
                    {/* Service & Status */}
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight">{detailsBooking.service}</h3>
                      <span
                        className={
                          "mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium " +
                          (statusStyles[detailsBooking.status?.toLowerCase() ?? ""] ?? "bg-muted text-muted-foreground")
                        }
                      >
                        {statusLabels[detailsBooking.status?.toLowerCase() ?? ""] ?? detailsBooking.status}
                      </span>
                    </div>

                    {/* Schedule */}
                    <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date & time</p>
                          <p className="font-semibold">{formatDate(detailsBooking.date)}</p>
                          <p className="text-sm text-muted-foreground">{formatTime(detailsBooking.time)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <p className="text-sm"><span className="text-muted-foreground">Frequency</span> <span className="font-medium">{detailsBooking.frequency?.trim() || "—"}</span></p>
                        {detailsBooking.frequencyRepeatsDisplay?.trim() ? (
                          <p className="text-sm pl-7"><span className="text-muted-foreground">Repeats every</span> <span className="font-medium">{detailsBooking.frequencyRepeatsDisplay.trim()}</span></p>
                        ) : null}
                      </div>
                      {(() => {
                        const mins = resolveBookingDurationMinutes({
                          durationMinutes: detailsBooking.durationMinutes,
                          customization: detailsBooking.customization,
                        });
                        if (mins == null) return null;
                        return (
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                            <p className="text-sm">
                              <span className="text-muted-foreground">Length</span>{" "}
                              <span className="font-medium">{formatLengthLabel(mins)}</span>
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Booking summary – same structure as book-now: variable categories + legacy fields + extras */}
                    {(() => {
                      const cust = detailsBooking.customization;
                      if (!cust || typeof cust !== "object") return null;
                      const vc = (cust as { variableCategories?: Record<string, string> }).variableCategories ?? {};
                      const hasVc = Object.keys(vc).length > 0;
                      const legacy = {
                        sqft: cust.squareMeters?.trim(),
                        bedroom: cust.bedroom?.trim(),
                        bathroom: cust.bathroom?.trim(),
                      };
                      const hasLegacy = legacy.sqft || legacy.bedroom || legacy.bathroom;
                      const rawExtras = cust.extras;
                      const extrasList = Array.isArray(rawExtras)
                        ? rawExtras
                            .filter((e) => e !== "None" && e != null)
                            .map((e) => (typeof e === "string" ? e : `${(e as { name?: string }).name ?? ""}${((e as { quantity?: number }).quantity ?? 0) > 1 ? ` (${(e as { quantity?: number }).quantity})` : ""}`))
                            .filter(Boolean)
                        : [];
                      const hasExtras = extrasList.length > 0;
                      const hasAny = hasVc || hasLegacy || hasExtras;
                      if (!hasAny) return null;
                      const label = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).replace(/\b(sqft|sq ft|area|size)\b/gi, (m) => (/sqft|sq ft/i.test(m) ? "Sq Ft" : m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()));
                      return (
                        <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Booking summary</p>
                          <div className="grid gap-2 text-sm">
                            {hasVc
                              ? Object.entries(vc).map(([categoryKey, value]) => {
                                  const v = value != null && String(value).trim() !== "" ? String(value).trim() : null;
                                  if (!v) return null;
                                  return (
                                    <div key={categoryKey} className="flex justify-between">
                                      <span className="text-muted-foreground">{label(categoryKey)}</span>
                                      <span className="font-medium">{v}</span>
                                    </div>
                                  );
                                })
                              : null}
                            {!hasVc && (
                              <>
                                {legacy.sqft && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Sq Ft</span>
                                    <span className="font-medium">{legacy.sqft}</span>
                                  </div>
                                )}
                                {legacy.bedroom && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Bedroom</span>
                                    <span className="font-medium">{legacy.bedroom}</span>
                                  </div>
                                )}
                                {legacy.bathroom && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Bathroom</span>
                                    <span className="font-medium">{legacy.bathroom}</span>
                                  </div>
                                )}
                              </>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Extras</span>
                              <span className="font-medium text-right">{hasExtras ? extrasList.join(", ") : "—"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Provider & Location */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned provider</p>
                          <p className="font-semibold">{detailsBooking.provider?.trim() || "Unassigned"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</p>
                          <p className="font-semibold">{detailsBooking.address}</p>
                          {detailsBooking.contact && (
                            <p className="mt-1 text-sm text-muted-foreground">Contact: {detailsBooking.contact}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <CustomerBookingPaymentSummary
                          summary={detailsBooking.pricingSummary}
                          totalFallback={detailsBooking.price}
                        />
                      </div>
                    </div>

                    {/* Cancellation fee (if booking was cancelled and fee was applied) */}
                    {(["canceled", "cancelled"].includes(detailsBooking.status?.toLowerCase() ?? "") && detailsBooking.cancellationFeeAmount != null && detailsBooking.cancellationFeeAmount > 0) && (
                      <div className="flex items-center justify-between rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3">
                        <span className="text-sm font-medium text-muted-foreground">Cancellation fee applied</span>
                        <span className="font-semibold">{detailsBooking.cancellationFeeCurrency ?? "$"}{detailsBooking.cancellationFeeAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Cancellation policy disclaimer */}
                    <div className="rounded-xl border bg-muted/30 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Cancellation disclaimer</p>
                      <p className="text-sm text-muted-foreground">
                        {detailsCancellationDisclaimer ?? "Based on our cancellation policy, a fee may apply if you cancel within the policy window."}
                      </p>
                    </div>

                    {detailsBooking.notes?.trim() && (
                      <div className="rounded-xl border p-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
                        <p className="text-sm">{detailsBooking.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>

          </main>
        </div>
      </div>
    </div>
  );
};

export default CustomerAppointmentsPage;
