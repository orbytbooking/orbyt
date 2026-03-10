"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { BillingStripeConnect } from "./BillingStripeConnect";
import { BillingAuthorizeNet } from "./BillingAuthorizeNet";

type PaymentProvider = "stripe" | "authorize_net";

export function BillingPaymentProvider() {
  const { currentBusiness } = useBusiness();
  const [provider, setProvider] = useState<PaymentProvider>("stripe");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const businessId = currentBusiness?.id ?? null;

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/payment-settings?business=${encodeURIComponent(businessId)}`, {
          credentials: "include",
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          const p = data.paymentProvider;
          setProvider(p === "authorize_net" ? "authorize_net" : "stripe");
        }
      } catch {
        if (!cancelled) setProvider("stripe");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const handleProviderChange = async (value: string) => {
    const newProvider = value === "authorize_net" ? "authorize_net" : "stripe";
    if (newProvider === provider) return;
    if (!businessId) {
      toast.error("No business selected");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/payment-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-business-id": businessId,
        },
        body: JSON.stringify({ paymentProvider: newProvider }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setProvider(newProvider);
        const label = newProvider === "stripe" ? "Stripe" : "Authorize.net";
        toast.success(`${label} selected for payments`);
      } else {
        toast.error(data.error || "Failed to update payment provider");
      }
    } catch {
      toast.error("Failed to update payment provider");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !businessId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing &amp; payments</CardTitle>
          <CardDescription>Choose how to accept online payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment provider</CardTitle>
          <CardDescription>
            Select which payment integration to use for online bookings. Customers will pay through the selected provider.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={provider}
            onValueChange={handleProviderChange}
            disabled={saving}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="stripe" id="provider-stripe" />
              <Label htmlFor="provider-stripe" className="font-normal cursor-pointer">
                Stripe — connect your Stripe account to receive payments directly
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="authorize_net" id="provider-authorize-net" />
              <Label htmlFor="provider-authorize-net" className="font-normal cursor-pointer">
                Authorize.net — connect your own merchant account
              </Label>
            </div>
          </RadioGroup>
          {saving && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </div>
          )}
        </CardContent>
      </Card>

      {provider === "stripe" && <BillingStripeConnect />}
      {provider === "authorize_net" && <BillingAuthorizeNet />}
    </div>
  );
}
