"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, LayoutDashboard, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BookingsTable } from "@/components/customer/BookingsTable";
import { CustomerSidebar } from "@/components/customer/CustomerSidebar";
import { useCustomerBookings } from "@/hooks/useCustomerBookings";
import { useCustomerAccount } from "@/hooks/useCustomerAccount";
import { Booking } from "@/lib/customer-bookings";
import { Input } from "@/components/ui/input";

const CustomerAppointmentsPage = () => {
  const router = useRouter();
  const { bookings, loading: bookingsLoading, updateBookings } = useCustomerBookings();
  const { customerName, customerEmail, accountLoading, handleLogout } = useCustomerAccount();
  const [search, setSearch] = useState("");

  const upcomingBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "scheduled"),
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

  const handleCancelBooking = (booking: Booking) => {
    if (typeof window !== "undefined") {
      const confirmCancel = window.confirm(`Cancel booking ${booking.id}?`);
      if (!confirmCancel) return;
    }
    updateBookings((prev) =>
      prev.map((item) => (item.id === booking.id ? { ...item, status: "canceled" } : item)),
    );
  };

  const handleEditBooking = (booking: Booking) => {
    router.push(`/book-now?bookingId=${booking.id}`);
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
                <Link href="/book-now">Book a new appointment</Link>
              </Button>
            </div>

            <BookingsTable
              bookings={filteredBookings}
              emptyMessage="No appointments yet. Schedule your first service to get started."
              onCancelBooking={handleCancelBooking}
              onEditBooking={handleEditBooking}
            />
          </main>
        </div>
      </div>
    </div>
  );
};

export default CustomerAppointmentsPage;
