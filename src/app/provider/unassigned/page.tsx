"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getSupabaseProviderClient } from "@/lib/supabaseProviderClient";
import { Briefcase, MapPin, Calendar, Clock, DollarSign, Loader2 } from "lucide-react";

type UnassignedBooking = {
  id: string;
  service: string;
  scheduled_date: string;
  scheduled_time: string;
  address: string;
  apt_no?: string;
  zip_code?: string;
  total_price: number;
  customer_name: string;
  customer_phone?: string;
  notes?: string;
  status: string;
  unassigned_priority?: string;
};

export default function ProviderUnassignedPage() {
  const [bookings, setBookings] = useState<UnassignedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [grabbing, setGrabbing] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUnassigned = async () => {
    try {
      const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
      if (!session) return;
      const res = await fetch("/api/provider/unassigned", {
        headers: { Authorization: `Bearer ${session.access_token}` },
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
    fetchUnassigned();
  }, []);

  const handleGrabJob = async (bookingId: string) => {
    setGrabbing(bookingId);
    try {
      const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "Please log in again", variant: "destructive" });
        return;
      }
      const res = await fetch("/api/provider/grab-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error || "Failed to grab job", variant: "destructive" });
        return;
      }
      toast({ title: "Job added!", description: "The booking has been added to your schedule." });
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setGrabbing(null);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  const formatTime = (t: string) => {
    if (!t) return "";
    if (t.includes(":")) return t.slice(0, 5);
    return t;
  };

  const formatAddress = (b: UnassignedBooking) => {
    const parts = [b.address];
    if (b.apt_no) parts.push(`Apt ${b.apt_no}`);
    if (b.zip_code) parts.push(b.zip_code);
    return parts.join(", ");
  };

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
        <h1 className="text-2xl font-bold">Unassigned Jobs</h1>
        <p className="text-muted-foreground mt-1">
          Grab jobs that need a provider. Once you grab a job, it will appear in My Bookings.
        </p>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No unassigned jobs at the moment.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Check back later or contact your admin if you expect new bookings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bookings.map((b) => (
            <Card key={b.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{b.service}</CardTitle>
                    <CardDescription>{b.customer_name}</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleGrabJob(b.id)}
                    disabled={grabbing === b.id}
                  >
                    {grabbing === b.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Grab Job"
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  {formatDate(b.scheduled_date)} at {formatTime(b.scheduled_time)}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {formatAddress(b)}
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">${Number(b.total_price || 0).toFixed(2)}</span>
                </div>
                {b.notes && (
                  <p className="text-muted-foreground pt-2 border-t">
                    <strong>Notes:</strong> {b.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
