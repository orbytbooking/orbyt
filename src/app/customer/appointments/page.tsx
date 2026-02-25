"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Clock, DollarSign, LayoutDashboard, MapPin, Search, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BookingsTable } from "@/components/customer/BookingsTable";
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
import { useToast } from "@/components/ui/use-toast";
import { getSupabaseCustomerClient } from "@/lib/supabaseCustomerClient";

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

const CustomerAppointmentsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams?.get("business") ?? "";
  const { bookings, loading: bookingsLoading, updateBookings } = useCustomerBookings();
  const { customerName, customerEmail, customerAccount, accountLoading, handleLogout } = useCustomerAccount();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [detailsBooking, setDetailsBooking] = useState<Booking | null>(null);
  const [cancelDialogBooking, setCancelDialogBooking] = useState<Booking | null>(null);
  const [cancellationDisclaimer, setCancellationDisclaimer] = useState<string | null>(null);
  const [cancellationPolicyLoading, setCancellationPolicyLoading] = useState(false);
  const [detailsCancellationDisclaimer, setDetailsCancellationDisclaimer] = useState<string | null>(null);
  const [rescheduleSettingsLoading, setRescheduleSettingsLoading] = useState(false);

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

  const firstName = customerName.split(" ")[0] || "Customer";
  const initials = useMemo(() => (
    customerName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "PP"
  ), [customerName]);

  const handleCancelBookingClick = (booking: Booking) => {
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
    setCancellingId(booking.id);
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
        body: JSON.stringify({ status: "canceled" }),
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
        prev.map((item) => (item.id === booking.id ? { ...item, status: "canceled" } : item)),
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

  if (bookingsLoading || accountLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Clock className="h-8 w-8 animate-spin" />
          <p>Loading your appointments...</p>
        </div>
      </div>
    );
  }

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
              <div className="flex-1 min-w-[200px] max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search bookings by service, provider, location, or ID"
                    className="pl-9"
                  />
                </div>
              </div>
              <Button asChild>
                <Link href={businessId ? `/book-now?business=${businessId}` : "/book-now"}>
                  Book a new appointment
                </Link>
              </Button>
            </div>

            <BookingsTable
              bookings={filteredBookings}
              emptyMessage="No appointments yet. Schedule your first service to get started."
              onCancelBooking={handleCancelBookingClick}
              onViewDetails={handleViewDetails}
              onEditReschedule={handleEditReschedule}
            />

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
                      <Button variant="destructive" onClick={handleCancelBookingConfirm} disabled={cancellingId === cancelDialogBooking.id}>
                        {cancellingId === cancelDialogBooking.id ? "Canceling…" : "Cancel booking"}
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
                      </div>
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

                    {/* Amount */}
                    <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Total amount</span>
                      </div>
                      <span className="text-lg font-bold">{formatCurrency(detailsBooking.price)}</span>
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
