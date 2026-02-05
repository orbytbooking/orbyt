"use client";

import { useMemo, useState } from "react";
import { Clock, CircleOff, Search } from "lucide-react";

import { CustomerSidebar } from "@/components/customer/CustomerSidebar";
import { BookingsTable } from "@/components/customer/BookingsTable";
import { useCustomerBookings } from "@/hooks/useCustomerBookings";
import { useCustomerAccount } from "@/hooks/useCustomerAccount";
import { Input } from "@/components/ui/input";

const CustomerCanceledAppointmentsPage = () => {
  const { bookings, loading: bookingsLoading } = useCustomerBookings();
  const { customerName, customerEmail, customerAccount, accountLoading, handleLogout } = useCustomerAccount();
  const [search, setSearch] = useState("");

  const canceledBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "canceled"),
    [bookings],
  );

  const filteredBookings = useMemo(() => {
    if (!search.trim()) return canceledBookings;
    const term = search.toLowerCase();
    return canceledBookings.filter(
      (booking) =>
        booking.service.toLowerCase().includes(term) ||
        booking.provider.toLowerCase().includes(term) ||
        booking.address.toLowerCase().includes(term) ||
        booking.id.toLowerCase().includes(term),
    );
  }, [canceledBookings, search]);

  const firstName = customerName.split(" ")[0] || "Customer";
  const initials = useMemo(() => (
    customerName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "PP"
  ), [customerName]);

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
                <CircleOff className="h-4 w-4" />
                Canceled services
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Canceled appointments</h1>
              <p className="text-sm text-muted-foreground">
                Review bookings you canceled or rescheduled for future reference.
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
                    placeholder="Search canceled bookings"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <BookingsTable
              bookings={filteredBookings}
              emptyMessage="You haven’t canceled any appointments yet."
            />
          </main>
        </div>
      </div>
    </div>
  );
};

export default CustomerCanceledAppointmentsPage;
