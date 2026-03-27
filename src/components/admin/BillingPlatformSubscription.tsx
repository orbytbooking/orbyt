"use client";

import { useEffect, useState, useCallback } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Shield, ExternalLink } from "lucide-react";
import { EmbeddedPlatformCheckoutDialog } from "@/components/billing/EmbeddedPlatformCheckoutDialog";
import { openStripeHostedPopup } from "@/lib/stripe/openStripeHostedPopup";

const stripeEmbeddedEnabled =
  typeof process !== "undefined" && Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());

type StatusPayload = {
  businessPlan: string;
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  } | null;
  plan: {
    id: string;
    name: string;
    slug: string;
    amount_cents: number;
    billing_interval: string;
    stripe_price_id: string | null;
  } | null;
  recentPayments: {
    id: string;
    amount_cents: number;
    currency: string;
    paid_at: string;
    status: string;
    description: string | null;
  }[];
};

const PLANS = [
  { slug: "starter", name: "Starter", blurb: "$19/mo — core scheduling, unlimited bookings" },
  { slug: "growth", name: "Growth", blurb: "$49/mo — advanced scheduling, branding, chat support" },
  { slug: "premium", name: "Premium", blurb: "$110/mo — everything in Growth + API & priority support" },
];

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase() === "USD" ? "USD" : currency.toUpperCase(),
  }).format(cents / 100);
}

export function BillingPlatformSubscription() {
  const { currentBusiness } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [payload, setPayload] = useState<StatusPayload | null>(null);
  const [embeddedCheckoutSecret, setEmbeddedCheckoutSecret] = useState<string | null>(null);
  const [embeddedCheckoutOpen, setEmbeddedCheckoutOpen] = useState(false);

  const load = useCallback(async () => {
    if (!currentBusiness?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/platform/billing/status?businessId=${encodeURIComponent(currentBusiness.id)}`,
        { credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load subscription");
      }
      setPayload(json as StatusPayload);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to load subscription");
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const startCheckout = async (planSlug: string) => {
    if (!currentBusiness?.id) return;
    setBusy(`checkout-${planSlug}`);
    try {
      const res = await fetch("/api/platform/billing/create-checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          planSlug,
          embedded: stripeEmbeddedEnabled,
        }),
      });
      const json = (await res.json()) as { url?: string; clientSecret?: string; error?: string };
      if (!res.ok) {
        toast.error(json.error || "Checkout failed");
        return;
      }
      if (stripeEmbeddedEnabled && json.clientSecret) {
        setEmbeddedCheckoutSecret(json.clientSecret);
        setEmbeddedCheckoutOpen(true);
        return;
      }
      if (json.url) {
        window.location.href = json.url;
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not start checkout");
    } finally {
      setBusy(null);
    }
  };

  const openPortal = async () => {
    if (!currentBusiness?.id) return;
    setBusy("portal");
    try {
      const res = await fetch("/api/platform/billing/portal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: currentBusiness.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Portal unavailable");
        return;
      }
      if (json.url) {
        openStripeHostedPopup(json.url as string);
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not open billing portal");
    } finally {
      setBusy(null);
    }
  };

  if (!currentBusiness) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Select a business to manage your Orbyt plan.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading subscription…
      </div>
    );
  }

  const activeSlug = payload?.plan?.slug ?? payload?.businessPlan ?? "starter";
  const sub = payload?.subscription;

  return (
    <div className="space-y-6">
      <EmbeddedPlatformCheckoutDialog
        open={embeddedCheckoutOpen}
        onOpenChange={(open) => {
          setEmbeddedCheckoutOpen(open);
          if (!open) setEmbeddedCheckoutSecret(null);
        }}
        clientSecret={embeddedCheckoutSecret}
        title="Orbyt plan checkout"
        description="Subscribe securely with Stripe. After payment you may be redirected back to this page."
      />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Orbyt platform plan</CardTitle>
          </div>
          <CardDescription>
            Pay Orbyt for your workspace plan. Customer booking payments are separate (configured under Billing →
            payment provider).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Current plan:</span>
            <Badge variant="secondary" className="capitalize">
              {activeSlug}
            </Badge>
            {sub?.status && (
              <Badge variant="outline" className="capitalize">
                {sub.status.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
          {sub?.currentPeriodEnd && (
            <p className="text-sm text-muted-foreground">
              Current period ends{" "}
              <strong>{new Date(sub.currentPeriodEnd).toLocaleDateString()}</strong>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void openPortal()}
              disabled={busy !== null || !sub?.stripeCustomerId}
              title="Opens Stripe billing and invoices in a new window so you stay in Orbyt"
            >
              {busy === "portal" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Manage subscription & invoices
            </Button>
            {!sub?.stripeCustomerId && (
              <span className="text-xs text-muted-foreground self-center">
                Available after you complete Stripe checkout for your plan.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = p.slug === activeSlug;
          return (
            <Card key={p.slug} className={isCurrent ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle className="text-lg">{p.name}</CardTitle>
                <CardDescription>{p.blurb}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isCurrent ? (
                  <Badge>Current</Badge>
                ) : (
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => void startCheckout(p.slug)}
                    disabled={busy !== null}
                  >
                    {busy === `checkout-${p.slug}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      `Choose ${p.name}`
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {payload?.recentPayments && payload.recentPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent platform payments</CardTitle>
            <CardDescription>Subscription charges to Orbyt (not customer bookings).</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {payload.recentPayments.map((row) => (
                <li
                  key={row.id}
                  className="flex justify-between border-b border-border/50 pb-2 last:border-0"
                >
                  <span className="text-muted-foreground">
                    {new Date(row.paid_at).toLocaleString()}
                  </span>
                  <span className="font-medium">{formatMoney(row.amount_cents, row.currency)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
