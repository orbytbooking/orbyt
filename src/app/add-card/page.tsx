"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";

function AddCardInner({
  token,
  clientSecret,
  onComplete,
}: {
  token: string;
  clientSecret: string;
  onComplete: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="rounded-md border px-3 py-2">
        <CardElement
          options={{
            hidePostalCode: true,
            style: {
              base: {
                fontSize: "14px",
                color: "var(--foreground)",
                "::placeholder": { color: "var(--muted-foreground)" },
              },
              invalid: { color: "var(--destructive)" },
            },
          }}
        />
      </div>
      <div className="flex items-center gap-2 -mt-1">
        <img
          src="/card-logos/mastercard.svg"
          alt="Mastercard"
          className="h-6 w-auto rounded-sm"
          loading="lazy"
        />
        <img
          src="/card-logos/visa.svg"
          alt="Visa"
          className="h-6 w-auto rounded-sm"
          loading="lazy"
        />
        <img
          src="/card-logos/discover.svg"
          alt="Discover"
          className="h-6 w-auto rounded-sm"
          loading="lazy"
        />
        <img
          src="/card-logos/amex.svg"
          alt="American Express"
          className="h-6 w-auto rounded-sm"
          loading="lazy"
        />
        <div className="h-6 px-2 rounded border bg-lime-50 text-lime-700 text-[10px] font-semibold inline-flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          Safe &amp; Secure
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2 justify-end">
        <Button
          onClick={async () => {
            if (!stripe || !elements) return;
            setSaving(true);
            setError(null);
            try {
              const result = await stripe.confirmCardSetup(clientSecret, {
                payment_method: { card: elements.getElement(CardElement)! },
              });
              if (result.error) {
                setError(result.error.message || "Could not add card.");
                return;
              }
              const setupIntentId = result.setupIntent?.id;
              if (!setupIntentId) {
                setError("Missing setup intent id.");
                return;
              }
              const res = await fetch("/api/stripe/customer-add-card/link/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, setupIntentId }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                setError(data?.error || `Could not save card (${res.status})`);
                return;
              }
              onComplete();
            } finally {
              setSaving(false);
            }
          }}
          disabled={!stripe || !elements || saving}
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Add Card
        </Button>
      </div>
    </div>
  );
}

function AddCardPageContent() {
  const searchParams = useSearchParams();
  const token = (searchParams?.get("token") || "").trim();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pk, setPk] = useState<string | null>(null);
  const [stripeAccount, setStripeAccount] = useState<string | null>(null);
  const stripePromiseRef = useRef<Promise<StripeJs | null> | null>(null);

  const stripePromise = useMemo(() => {
    if (!pk) return null;
    if (!stripePromiseRef.current) {
      stripePromiseRef.current = loadStripe(pk, stripeAccount ? { stripeAccount } : undefined);
    }
    return stripePromiseRef.current;
  }, [pk, stripeAccount]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch("/api/stripe/customer-add-card/link/setup-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.error || `Could not load link (${res.status})`);
          return;
        }
        const publishableKey = typeof data.publishableKey === "string" ? data.publishableKey : null;
        const cs = typeof data.clientSecret === "string" ? data.clientSecret : null;
        const acct = typeof data.stripeConnectAccountId === "string" ? data.stripeConnectAccountId : null;
        if (!publishableKey || !cs) {
          setError("Stripe is not configured.");
          return;
        }
        setPk(publishableKey);
        setStripeAccount(acct);
        stripePromiseRef.current = null;
        setClientSecret(cs);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load link.");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Add card</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token ? <p className="text-sm text-muted-foreground">Missing token.</p> : null}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {done ? (
            <p className="text-sm">Card added successfully. You can close this page.</p>
          ) : null}
          {!done && token && clientSecret && stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <AddCardInner token={token} clientSecret={clientSecret} onComplete={() => setDone(true)} />
            </Elements>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AddCardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Add card</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <AddCardPageContent />
    </Suspense>
  );
}

