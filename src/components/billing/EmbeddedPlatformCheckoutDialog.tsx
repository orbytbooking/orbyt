"use client";

import { useEffect, useRef, useState } from "react";
import { loadStripe, type StripeEmbeddedCheckout } from "@stripe/stripe-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** From `POST` create-checkout / create-checkout-pending when `embedded: true`. */
  clientSecret: string | null;
  title?: string;
  description?: string;
};

export function EmbeddedPlatformCheckoutDialog({
  open,
  onOpenChange,
  clientSecret,
  title = "Secure checkout",
  description = "Complete your Orbyt plan payment.",
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<StripeEmbeddedCheckout | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !clientSecret) return;

    let cancelled = false;
    setError(null);

    (async () => {
      const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!pk?.trim()) {
        setError("Stripe publishable key is not configured (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).");
        return;
      }
      const stripe = await loadStripe(pk);
      const el = mountRef.current;
      if (!stripe || !el || cancelled) return;
      el.innerHTML = "";
      const embedded = await stripe.initEmbeddedCheckout({ clientSecret });
      if (cancelled) {
        embedded.destroy();
        return;
      }
      instanceRef.current = embedded;
      embedded.mount(el);
    })().catch((e: unknown) => {
      if (!cancelled) {
        setError(e instanceof Error ? e.message : "Could not load checkout.");
      }
    });

    return () => {
      cancelled = true;
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [open, clientSecret]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[min(100vw-1.5rem,72rem)] max-h-[94vh] overflow-y-auto overflow-x-hidden p-0 gap-0 sm:rounded-xl border-border/80 shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-3 pr-14 sm:px-8">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="text-base">{description}</DialogDescription>
        </DialogHeader>
        <div className="px-3 pb-5 sm:px-8">
          {error ? (
            <p className="text-sm text-destructive px-2">{error}</p>
          ) : (
            <div ref={mountRef} className="min-h-[min(620px,78vh)] w-full" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
