"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { DollarSign, Loader2, CreditCard, Banknote } from "lucide-react";

type PendingBooking = {
  id: string;
  service: string;
  scheduled_date: string;
  scheduled_time: string;
  total_price: number;
  customer_name: string;
  customer_email: string | null;
  payment_method: string | null;
};

export default function BookingChargesPage() {
  const { currentBusiness } = useBusiness();
  const [bookings, setBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/booking-charges?businessId=${currentBusiness.id}`, {
        headers: { "x-business-id": currentBusiness.id },
      });
      const data = await res.json();
      setBookings(data.bookings ?? []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [currentBusiness?.id]);

  const handleMarkCash = async (bookingId: string) => {
    setActing(bookingId);
    try {
      const res = await fetch(`/api/admin/booking-charges/${bookingId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-business-id": currentBusiness!.id,
        },
        body: JSON.stringify({ method: "cash" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Marked as paid (cash/check)");
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(null);
    }
  };

  const handleSendPaymentLink = async (bookingId: string) => {
    setActing(bookingId);
    try {
      const res = await fetch(`/api/admin/booking-charges/${bookingId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-business-id": currentBusiness!.id,
        },
        body: JSON.stringify({ method: "online" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data.checkoutUrl) {
        await navigator.clipboard.writeText(data.checkoutUrl);
        toast.success("Payment link copied to clipboard. Send it to the customer.");
        window.open(data.checkoutUrl, "_blank", "noopener");
      } else {
        toast.success(data.message || "Done");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(null);
    }
  };

  const formatDate = (d?: string) => (d ? new Date(d + "T00:00:00").toLocaleDateString() : "");
  const formatTime = (t?: string) => (t ? (String(t).includes(":") ? String(t).slice(0, 5) : String(t)) : "");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Booking Charges</h1>
        <p className="text-muted-foreground mt-1">
          Charge customers for completed services (Booking Koala style)
        </p>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No pending charges.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Completed bookings with payment pending will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bookings.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="font-semibold">{b.service}</p>
                    <p className="text-muted-foreground">{b.customer_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(b.scheduled_date)} at {formatTime(b.scheduled_time)}
                    </p>
                    <p className="text-lg font-bold mt-1">${Number(b.total_price || 0).toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!!acting}
                      onClick={() => handleMarkCash(b.id)}
                    >
                      {acting === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4 mr-1" />}
                      Mark Cash/Check
                    </Button>
                    <Button
                      size="sm"
                      disabled={!!acting}
                      onClick={() => handleSendPaymentLink(b.id)}
                    >
                      {acting === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4 mr-1" />}
                      Send Payment Link
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
