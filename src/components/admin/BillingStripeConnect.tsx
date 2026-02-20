"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Loader2, ExternalLink, CheckCircle2, AlertCircle, Unplug } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";

type ConnectStatus = {
  connected: boolean;
  accountId: string | null;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
};

export function BillingStripeConnect() {
  const { currentBusiness } = useBusiness();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const businessId = currentBusiness?.id ?? null;

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      setStatus(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/stripe/connect/status?business=${encodeURIComponent(businessId)}`,
          { credentials: "include" }
        );
        if (!cancelled && res.ok) {
          const data = await res.json();
          setStatus({
            connected: data.connected ?? false,
            accountId: data.accountId ?? null,
            detailsSubmitted: data.detailsSubmitted ?? false,
            chargesEnabled: data.chargesEnabled ?? false,
          });
        } else if (!cancelled) {
          setStatus({
            connected: false,
            accountId: null,
            detailsSubmitted: false,
            chargesEnabled: false,
          });
        }
      } catch {
        if (!cancelled) setStatus(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const fetchStatus = async () => {
    if (!businessId) return;
    try {
      const res = await fetch(
        `/api/stripe/connect/status?business=${encodeURIComponent(businessId)}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setStatus({
          connected: data.connected ?? false,
          accountId: data.accountId ?? null,
          detailsSubmitted: data.detailsSubmitted ?? false,
          chargesEnabled: data.chargesEnabled ?? false,
        });
      }
    } catch {
      setStatus(null);
    }
  };

  const handleConnect = async () => {
    if (!businessId) {
      toast.error("No business selected");
      return;
    }
    setConnecting(true);
    try {
      const res = await fetch("/api/stripe/connect/create-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-business-id": businessId,
        },
        body: JSON.stringify({ businessId }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
        return;
      }
      const message = data.details ? `${data.error} ${data.details}` : (data.error || "Failed to start Stripe Connect");
      toast.error(message);
    } catch {
      toast.error("Failed to connect to Stripe");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!businessId) return;
    if (!confirm("Disconnect Stripe? Online booking payments will no longer go to your Stripe account until you connect again.")) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await fetch("/api/stripe/connect/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-business-id": businessId,
        },
        body: JSON.stringify({ businessId }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Stripe disconnected");
        await fetchStatus();
      } else {
        toast.error(data.error || "Failed to disconnect Stripe");
      }
    } catch {
      toast.error("Failed to disconnect Stripe");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Billing
          </CardTitle>
          <CardDescription>Manage payment methods and where you receive payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading billing status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isFullyOnboarded = status?.connected && status?.detailsSubmitted && status?.chargesEnabled;

  // Derive mode from publishable key (pk_test_ = test, pk_live_ = live)
  const isTestMode =
    typeof process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === "string" &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_live_")
      ? false
      : true;
  const stripeModeLabel = isTestMode ? "Stripe test mode" : "Stripe live mode";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Billing &amp; payments</CardTitle>
          </div>
          <Badge variant="secondary" className="font-normal">
            {stripeModeLabel}
          </Badge>
        </div>
        <CardDescription>
          Connect your Stripe account to receive customer payments. When you go live, payments will go to your connected account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!status?.connected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect with Stripe to receive payments from online bookings. You’ll add your bank or card details securely in Stripe’s flow.
              {isTestMode ? " Right now we’re using Stripe test mode." : " You’re using Stripe live mode—real payments will be processed."}
            </p>
            <Button
              onClick={handleConnect}
              disabled={connecting || !businessId}
              style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)", color: "white" }}
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect with Stripe
                </>
              )}
            </Button>
          </div>
        ) : !isFullyOnboarded ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Complete your Stripe setup</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your Stripe account is created but not yet fully set up. Finish onboarding so you can receive payments.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleConnect}
                disabled={connecting}
                variant="outline"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Complete setup
              </Button>
              <Button
                onClick={handleDisconnect}
                disabled={disconnecting}
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
              >
                {disconnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unplug className="h-4 w-4 mr-2" />}
                Disconnect Stripe
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Stripe connected</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Customer payments from online checkout will go to your connected Stripe account.
              {isTestMode ? " You’re currently in test mode." : " You’re in live mode—payments are real."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleConnect}
                disabled={connecting}
                variant="outline"
                size="sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Update or manage in Stripe
              </Button>
              <Button
                onClick={handleDisconnect}
                disabled={disconnecting}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
              >
                {disconnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unplug className="h-4 w-4 mr-2" />}
                Disconnect Stripe
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
