"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getSupabaseProviderClient } from "@/lib/supabaseProviderClient";
import { Mail, MapPin, Calendar, Clock, DollarSign, Loader2, CheckCircle, XCircle } from "lucide-react";

type Invitation = {
  id: string;
  bookingId: string;
  status: string;
  sentAt: string;
  service?: string;
  date?: string;
  time?: string;
  address?: string;
  aptNo?: string;
  totalPrice?: number;
  customerName?: string;
  customerPhone?: string;
};

export default function ProviderInvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInvitations = async () => {
    try {
      const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
      if (!session) return;
      const res = await fetch("/api/provider/invitation", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setInvitations(data.invitations ?? []);
    } catch {
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleAccept = async (invitationId: string) => {
    setActing(invitationId);
    try {
      const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
      if (!session) return;
      const res = await fetch("/api/provider/invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ invitationId, action: "accept" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error || "Failed to accept", variant: "destructive" });
        return;
      }
      toast({ title: "Booking accepted", description: "The booking has been added to your schedule." });
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setActing(null);
    }
  };

  const handleDecline = async (invitationId: string) => {
    setActing(invitationId);
    try {
      const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
      if (!session) return;
      const res = await fetch("/api/provider/invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ invitationId, action: "decline" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error || "Failed to decline", variant: "destructive" });
        return;
      }
      toast({ title: "Invitation declined" });
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setActing(null);
    }
  };

  const formatDate = (d?: string) => (d ? new Date(d + "T00:00:00").toLocaleDateString() : "");
  const formatTime = (t?: string) => (t ? (t.includes(":") ? t.slice(0, 5) : t) : "");
  const formatAddress = (inv: Invitation) => [inv.address, inv.aptNo ? `Apt ${inv.aptNo}` : null].filter(Boolean).join(", ");

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
        <h1 className="text-2xl font-bold">My Invitations</h1>
        <p className="text-muted-foreground mt-1">
          You have been invited to these bookings. Accept to add them to your schedule, or decline to pass to the next provider.
        </p>
      </div>

      {invitations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No pending invitations.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {invitations.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{inv.service || "Booking"}</h3>
                    <p className="text-muted-foreground">{inv.customerName || "—"}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {formatDate(inv.date)} at {formatTime(inv.time)}
                    </div>
                    {inv.address && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {formatAddress(inv)}
                      </div>
                    )}
                    <div className="flex items-center gap-2 font-semibold">
                      <DollarSign className="h-4 w-4" />
                      ${Number(inv.totalPrice || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={acting === inv.id}
                      onClick={() => handleDecline(inv.id)}
                    >
                      {acting === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      disabled={acting === inv.id}
                      onClick={() => handleAccept(inv.id)}
                    >
                      {acting === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      Accept
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
