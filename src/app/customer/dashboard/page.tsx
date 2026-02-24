"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  MapPin,
  Phone,
  Mail,
  Sparkles,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Booking } from "@/lib/customer-bookings";
import { useCustomerBookings } from "@/hooks/useCustomerBookings";
import { useCustomerAccount } from "@/hooks/useCustomerAccount";
import { CustomerSidebar } from "@/components/customer/CustomerSidebar";

const CustomerDashboard = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get('business');
  const { bookings, loading: bookingsLoading } = useCustomerBookings();
  const bookingsList = useMemo(
    () => (Array.isArray(bookings) ? bookings : []),
    [bookings]
  );
  const { customerName, customerEmail, customerAccount, accountLoading, handleLogout } = useCustomerAccount();
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const scheduledBookings = useMemo(() => {
    const list = Array.isArray(bookingsList) ? bookingsList : [];
    return list
      .filter((booking) => booking?.status === "scheduled")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [bookingsList]);

  useEffect(() => {
    if (scheduledBookings.length === 0) return;
    const earliest = new Date(scheduledBookings[0].date);
    setCalendarMonth((prev) => {
      if (prev.getFullYear() === earliest.getFullYear() && prev.getMonth() === earliest.getMonth()) {
        return prev;
      }
      return new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    });
  }, [scheduledBookings]);

  const completedCount = useMemo(() => {
    const list = Array.isArray(bookingsList) ? bookingsList : [];
    return list.filter((booking) => booking?.status === "completed").length;
  }, [bookingsList]);

  const canceledCount = useMemo(() => {
    const list = Array.isArray(bookingsList) ? bookingsList : [];
    return list.filter((booking) => booking?.status === "canceled").length;
  }, [bookingsList]);

  const nextBooking = scheduledBookings[0] ?? null;

  const firstName = (typeof customerName === "string" ? customerName : "").split(" ")[0] || "Customer";
  const initials = useMemo(() => {
    const name = typeof customerName === "string" ? customerName : "";
    const parts = (name.split(" ") ?? []).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "PP";
  }, [customerName]);

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const bookingsByDate = useMemo(() => {
    const list = Array.isArray(scheduledBookings) ? scheduledBookings : [];
    return list.reduce<Record<string, Booking[]>>((acc, booking) => {
      const key = booking?.date;
      if (!key) return acc;
      acc[key] = acc[key] ? [...acc[key], booking] : [booking];
      return acc;
    }, {});
  }, [scheduledBookings]);

  const calendarDays = useMemo(() => {
    const startDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const endDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);

    const calendarStart = new Date(startDate);
    calendarStart.setDate(startDate.getDate() - startDate.getDay());

    const calendarEnd = new Date(endDate);
    calendarEnd.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const today = new Date().toDateString();

    const days = [] as { date: Date; iso: string; isCurrentMonth: boolean; isToday: boolean }[];
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

  const goToPrevMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  if (bookingsLoading || accountLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Clock className="h-8 w-8 animate-spin" />
          <p>Loading your dashboard...</p>
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
            <div className="flex flex-col px-6 py-5">
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {firstName}</p>
            </div>
          </header>
          <main className="flex-1 space-y-10 px-4 py-8 sm:px-6 lg:px-10">
            <section className="bg-card border border-border rounded-3xl p-8 shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-60" />
              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div>
                  <p className="text-sm uppercase tracking-wider text-primary font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Welcome back
                  </p>
                  <h2 className="text-3xl md:text-4xl font-bold mt-2">Hi {firstName}, your home is in good hands.</h2>
                  <p className="text-muted-foreground mt-3 max-w-2xl">
                    Track your upcoming services, review booking details, and schedule new cleanings—all from your personal dashboard.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button size="lg" asChild>
                      <Link href={`/book-now${businessId ? `?business=${businessId}` : ''}`}>
                        Book a Service
                      </Link>
                    </Button>
                  </div>
                </div>
                {nextBooking && (
                  <Card className="w-full max-w-sm border-primary/30">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-primary" /> Next appointment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="text-lg font-semibold">{nextBooking.service}</p>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" /> {nextBooking.date} • {nextBooking.time}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> {nextBooking.address}
                      </p>
                      <div className="text-xs text-muted-foreground border border-dashed border-primary/40 rounded-lg p-3">
                        {nextBooking.notes}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Upcoming bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{scheduledBookings.length}</p>
                  <p className="text-sm text-muted-foreground">Scheduled in the next 30 days</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Completed services</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{completedCount}</p>
                  <p className="text-sm text-muted-foreground">Thanks for letting us serve you</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Canceled bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{canceledCount}</p>
                  <p className="text-sm text-muted-foreground">Recently canceled appointments</p>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card>
                <CardHeader className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Upcoming bookings</CardTitle>
                      <p className="text-sm text-muted-foreground">Plan ahead with your full calendar view.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevMonth} aria-label="Previous month">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextMonth} aria-label="Next month">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-lg font-semibold">{calendarMonthLabel}</p>
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
                          className={`rounded-2xl border p-2 min-h-[120px] flex flex-col gap-1 transition ${
                            day.isCurrentMonth ? "bg-background" : "bg-muted/60"
                          } ${day.isToday ? "ring-2 ring-primary" : ""}`}
                        >
                          <div className={`flex items-center justify-between text-xs font-semibold ${day.isCurrentMonth ? "text-foreground" : "text-muted-foreground"}`}>
                            <span>{day.date.getDate()}</span>
                            {events.length > 0 && (
                              <span className="text-[10px] text-primary font-medium">{events.length}×</span>
                            )}
                          </div>
                          <div className="space-y-1 overflow-y-auto">
                            {events.map((event, idx) => (
                              <div
                                key={`${event.id}-${event.date ?? ''}-${event.time ?? ''}-${idx}`}
                                className={`rounded-xl px-2 py-1 text-[11px] font-medium ${
                                  event.status === "completed"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : event.status === "canceled"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-sky-100 text-sky-700"
                                }`}
                              >
                                <p className="truncate">{event.time}</p>
                                <p className="truncate text-[10px] font-semibold">{event.service}</p>
                                <p className="text-[10px] font-medium text-muted-foreground/80 truncate">{event.provider}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {scheduledBookings.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground">
                      No upcoming services. Schedule your next visit to keep things sparkling.
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
