"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { DollarSign, Loader2, Banknote } from "lucide-react";

type ProviderPayment = {
  id: string;
  name: string;
  email: string;
  pendingAmount: number;
  pendingCount: number;
  paidAmount: number;
  paidCount: number;
};

export default function ProviderPaymentsPage() {
  const { currentBusiness } = useBusiness();
  const [providers, setProviders] = useState<ProviderPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  const fetchProviders = async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/provider-payments?businessId=${currentBusiness.id}`, {
        headers: { "x-business-id": currentBusiness.id },
      });
      const data = await res.json();
      setProviders(data.providers ?? []);
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [currentBusiness?.id]);

  const handlePay = async (providerId: string) => {
    setPaying(providerId);
    try {
      const res = await fetch(`/api/admin/provider-payments/${providerId}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-business-id": currentBusiness!.id,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(data.message || "Marked as paid");
      fetchProviders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPaying(null);
    }
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
        <h1 className="text-2xl font-bold">Provider Payments</h1>
        <p className="text-muted-foreground mt-1">
          Send payouts to providers. Mark pending earnings as paid after you process payment.
        </p>
      </div>

      {providers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No providers found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {providers.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.email}</p>
                    <div className="flex gap-6 mt-2">
                      <span className="text-sm">
                        Pending: <strong>${p.pendingAmount.toFixed(2)}</strong> ({p.pendingCount} jobs)
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Paid: ${p.paidAmount.toFixed(2)} ({p.paidCount} jobs)
                      </span>
                    </div>
                  </div>
                  {p.pendingCount > 0 && (
                    <Button
                      size="sm"
                      disabled={!!paying}
                      onClick={() => handlePay(p.id)}
                    >
                      {paying === p.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Banknote className="h-4 w-4 mr-2" />}
                      Mark as Paid
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
