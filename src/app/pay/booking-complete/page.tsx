"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function BookingPaymentCompleteInner() {
  const searchParams = useSearchParams();
  const cancelled = searchParams.get("cancelled") === "1";
  const sessionId = searchParams.get("session_id");
  const businessId = searchParams.get("business");
  const sentRef = useRef(false);

  const [phase, setPhase] = useState<"loading" | "ok" | "error" | "cancelled">(
    cancelled ? "cancelled" : "loading"
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cancelled) return;
    if (!sessionId || !businessId) {
      setPhase("error");
      setMessage("Missing payment details. Return to the payment link you were sent and try again.");
      return;
    }
    if (sentRef.current) return;
    sentRef.current = true;

    fetch("/api/stripe/confirm-booking-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, businessId }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setPhase("error");
          setMessage(
            typeof data.error === "string"
              ? data.error
              : "We could not confirm your payment. If you were charged, contact the business with your receipt."
          );
          return;
        }
        setPhase("ok");
      })
      .catch(() => {
        setPhase("error");
        setMessage("Could not reach the server. Check your connection or try again.");
      });
  }, [cancelled, sessionId, businessId]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border bg-card p-8 shadow-sm text-center space-y-4">
        {phase === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-cyan-600 mx-auto" />
            <h1 className="text-xl font-semibold">Confirming your payment…</h1>
            <p className="text-sm text-muted-foreground">This only takes a moment.</p>
          </>
        )}

        {phase === "cancelled" && (
          <>
            <XCircle className="h-12 w-12 text-amber-600 mx-auto" />
            <h1 className="text-xl font-semibold">Payment cancelled</h1>
            <p className="text-sm text-muted-foreground">
              No charge was made. You can close this page or try again from the link your provider sent.
            </p>
            {businessId ? (
              <Button asChild variant="outline" className="mt-4">
                <Link href={`/book-now?business=${encodeURIComponent(businessId)}`}>Book a service</Link>
              </Button>
            ) : null}
          </>
        )}

        {phase === "ok" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            <h1 className="text-xl font-semibold">Payment successful</h1>
            <p className="text-sm text-muted-foreground">
              Thank you. Your receipt may arrive by email. You can close this window.
            </p>
          </>
        )}

        {phase === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function BookingPaymentCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-600" />
        </div>
      }
    >
      <BookingPaymentCompleteInner />
    </Suspense>
  );
}
