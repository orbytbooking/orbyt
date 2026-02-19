"use client";

import { useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, MapPin, User, Phone, Sparkles, NotebookText } from "lucide-react";

import { CustomerSidebar } from "@/components/customer/CustomerSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCustomerBookings } from "@/hooks/useCustomerBookings";
import { useCustomerAccount } from "@/hooks/useCustomerAccount";
import { Booking } from "@/lib/customer-bookings";
import { useToast } from "@/components/ui/use-toast";

const formatBookingDateTime = (booking: Booking) => {
  const composed = new Date(`${booking.date}T${booking.time}`);
  if (Number.isNaN(composed.getTime())) {
    return `${booking.date} • ${booking.time}`;
  }
  const datePart = composed.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timePart = composed.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${datePart} • ${timePart}`;
};

const formatCurrency = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
};

const detailLabel = (label: string) => <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>;

export default function BookingDetailsPage() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = params?.bookingId ?? "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams?.get("business") ?? "";
  const { toast } = useToast();
  const { bookings, loading: bookingsLoading } = useCustomerBookings();
  const { customerName, customerEmail, customerAccount, accountLoading, handleLogout } = useCustomerAccount();

  const booking = useMemo(() => bookings.find((item) => item.id.toLowerCase() === bookingId.toLowerCase()), [bookings, bookingId]);

  const initials = useMemo(() => (
    customerName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "PP"
  ), [customerName]);

  const customization = booking?.customization ?? {};
  const vc = (customization as { variableCategories?: Record<string, string> }).variableCategories ?? {};
  const hasVc = Object.keys(vc).length > 0;
  const labelForCategory = (key: string) =>
    key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).replace(/\b(sqft|sq ft|area|size)\b/gi, (m) => (/sqft|sq ft/i.test(m) ? "Sq Ft" : m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()));
  const customizationRows = useMemo(() => {
    const rows: { label: string; value: string }[] = [];
    if (hasVc) {
      Object.entries(vc).forEach(([k, v]) => {
        const val = v != null && String(v).trim() !== "" ? String(v).trim() : null;
        if (val) rows.push({ label: labelForCategory(k), value: val });
      });
    } else {
      if (customization.squareMeters?.trim()) rows.push({ label: "Sq Ft", value: customization.squareMeters.trim() });
      if (customization.bedroom?.trim()) rows.push({ label: "Bedroom", value: customization.bedroom.trim() });
      if (customization.bathroom?.trim()) rows.push({ label: "Bathroom", value: customization.bathroom.trim() });
    }
    const rawExtras = customization.extras;
    const extrasList = Array.isArray(rawExtras)
      ? rawExtras
          .filter((e) => e !== "None" && e != null)
          .map((e) => (typeof e === "string" ? e : `${(e as { name?: string }).name ?? ""}${((e as { quantity?: number }).quantity ?? 0) > 1 ? ` (${(e as { quantity?: number }).quantity})` : ""}`))
          .filter(Boolean)
      : [];
    rows.push({ label: "Extras", value: extrasList.length > 0 ? extrasList.join(", ") : "—" });
    return rows;
  }, [customization, hasVc, vc]);

  const handleBookAgain = useCallback(() => {
    if (!booking) return;
    const params = new URLSearchParams({ bookingId: booking.id });
    if (businessId) params.set("business", businessId);
    router.push(`/book-now?${params.toString()}`);
  }, [booking, router, businessId]);

  const handleBack = useCallback(() => {
    router.push(businessId ? `/customer/appointments/history?business=${businessId}` : "/customer/appointments/history");
  }, [router, businessId]);

  if (bookingsLoading || accountLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Clock className="h-8 w-8 animate-spin" />
          <p>Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-muted/30 px-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Booking not found</h1>
          <p className="text-muted-foreground">We couldn&apos;t find booking {bookingId}. Please return to your history and try again.</p>
        </div>
        <Button onClick={handleBack}>Back to history</Button>
      </div>
    );
  }

  const infoChips = [
    { label: "Status", value: booking.status },
    { label: "Service", value: booking.service },
    { label: "Provider", value: booking.provider || "" },
  ];

  const detailRows = [
    { label: "Frequency", value: booking.frequency?.trim() || "—" },
    ...customizationRows,
  ];

  const notesList = [
    { icon: <NotebookText className="h-4 w-4" />, label: "Instructions", value: booking.notes || "No special instructions provided." },
    { icon: <Sparkles className="h-4 w-4" />, label: "Tip", value: booking.tipAmount ? `${formatCurrency(booking.tipAmount)} (${booking.tipUpdatedAt ? new Date(booking.tipUpdatedAt).toLocaleDateString() : "recorded"})` : "No tip recorded" },
  ];

  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[280px_1fr]">
        <CustomerSidebar customerName={customerName} customerEmail={customerEmail} initials={initials} businessName={customerAccount?.businessName || ''} onLogout={handleLogout} />
        <div className="order-1 flex flex-col lg:order-2">
          <header className="bg-background border-b border-border shadow-sm">
            <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
              <Button variant="ghost" size="sm" className="gap-2" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
                Back to history
              </Button>
              <div className="flex-1" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  toast({ title: "Tip flow", description: "Use the history page to add or update tips." });
                }}>
                  Add / Update tip
                </Button>
                <Button onClick={handleBookAgain}>Book again</Button>
              </div>
            </div>
          </header>

          <main className="flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-10">
            <section className="rounded-3xl border border-border bg-background/80 p-6 shadow-sm">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Booking ID • {booking.id}</p>
                <h1 className="text-3xl font-bold tracking-tight">{booking.service}</h1>
                <p className="text-muted-foreground">Scheduled for {formatBookingDateTime(booking)}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {infoChips.map((chip) => (
                  <Badge key={chip.label} variant="secondary" className="px-3 py-1 text-xs uppercase tracking-wide">
                    {chip.label}: {chip.value}
                  </Badge>
                ))}
              </div>

              <Separator className="my-6" />

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    {detailLabel("Date & Time")}
                    <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      {formatBookingDateTime(booking)}
                    </div>
                  </div>
                  <div>
                    {detailLabel("Service address")}
                    <div className="mt-1 flex items-start gap-2">
                      <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">{booking.address}</p>
                        <p className="text-sm text-muted-foreground">Contact: {booking.contact || "Not provided"}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    {detailLabel("Customer contact")}
                    <div className="mt-1 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.contact || "Not provided"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    {detailLabel("Assigned professional")}
                    <div className="mt-1 flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{booking.provider || ""}</span>
                    </div>
                  </div>
                  <div>
                    {detailLabel("Service total")}
                    <div className="mt-1 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                      <span className="text-lg font-semibold">{formatCurrency(booking.price)}</span>
                    </div>
                  </div>
                  <div>
                    {detailLabel("Customization summary")}
                    <ul className="mt-2 space-y-1 text-sm">
                      {detailRows.map((item) => (
                        <li key={item.label} className="flex justify-between gap-4">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">{item.value || "—"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="grid gap-4 md:grid-cols-2">
                {notesList.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-dashed border-muted p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {item.icon}
                      {item.label}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
