"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Loader2, CheckCircle2 } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";

export function BillingStripeKeys() {
  const { currentBusiness } = useBusiness();
  const [stripePublishKey, setStripePublishKey] = useState("");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripe3dsEnabled, setStripe3dsEnabled] = useState(true);
  const [stripeBillingAddressEnabled, setStripeBillingAddressEnabled] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const businessId = currentBusiness?.id ?? null;

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/payment-settings?business=${encodeURIComponent(businessId)}`,
          { credentials: "include", headers: { "x-business-id": businessId } }
        );
        if (cancelled || !res.ok) return;
        const data = await res.json();
        setHasExistingConfig(!!data.stripePublishableKeyMasked || !!data.stripeConnected);
        if (data.stripe3dsEnabled !== undefined) setStripe3dsEnabled(!!data.stripe3dsEnabled);
        if (data.stripeBillingAddressEnabled !== undefined) setStripeBillingAddressEnabled(!!data.stripeBillingAddressEnabled);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const handleSave = async () => {
    if (!businessId) {
      toast.error("No business selected");
      return;
    }
    setSaving(true);
    try {
      const body: {
        paymentProvider?: string;
        stripePublishableKey?: string;
        stripeSecretKey?: string;
        stripe3dsEnabled: boolean;
        stripeBillingAddressEnabled: boolean;
      } = {
        paymentProvider: "stripe",
        stripe3dsEnabled: stripe3dsEnabled,
        stripeBillingAddressEnabled: stripeBillingAddressEnabled,
      };
      if (stripePublishKey.trim()) body.stripePublishableKey = stripePublishKey.trim();
      if (stripeSecretKey.trim()) body.stripeSecretKey = stripeSecretKey.trim();

      const res = await fetch("/api/admin/payment-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-business-id": businessId },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Stripe credentials saved");
        setStripePublishKey("");
        setStripeSecretKey("");
        setHasExistingConfig(true);
      } else {
        const msg = data.details ? `${data.error || "Failed to save"}: ${data.details}` : (data.error || "Failed to save");
        toast.error(msg);
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Stripe
          </CardTitle>
          <CardDescription>Enter your Stripe API keys (classic gateway)</CardDescription>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Stripe
        </CardTitle>
        <CardDescription>
          Enter your Stripe API keys from the Stripe Dashboard. Use test keys (pk_test_..., sk_test_...) for testing; use live keys for production.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="stripe-publish-key">Publish key</Label>
          <Input
            id="stripe-publish-key"
            type="password"
            autoComplete="off"
            placeholder={hasExistingConfig ? "pk_test_... or pk_live_..." : "pk_test_... or pk_live_..."}
            value={stripePublishKey}
            onChange={(e) => setStripePublishKey(e.target.value)}
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stripe-secret-key">Secret key</Label>
          <Input
            id="stripe-secret-key"
            type="password"
            autoComplete="off"
            placeholder={hasExistingConfig ? "••••••••••••" : "sk_test_... or sk_live_..."}
            value={stripeSecretKey}
            onChange={(e) => setStripeSecretKey(e.target.value)}
            className="font-mono text-sm"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">3DS (Strong Customer Authentication)</Label>
            <p className="text-sm text-muted-foreground">Extra verification step for card payments.</p>
          </div>
          <Switch checked={stripe3dsEnabled} onCheckedChange={setStripe3dsEnabled} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Collect billing address</Label>
            <p className="text-sm text-muted-foreground">Ask for billing address at checkout.</p>
          </div>
          <Switch checked={stripeBillingAddressEnabled} onCheckedChange={setStripeBillingAddressEnabled} />
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || (!stripePublishKey.trim() && !stripeSecretKey.trim() && !hasExistingConfig)}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </Button>
        {hasExistingConfig && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Stripe is configured. Enter new keys above to update.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
