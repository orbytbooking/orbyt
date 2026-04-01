"use client";

import type { CustomerPortalPricingSummary } from "@/lib/customerBookingPricingDisplay";

const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);

type Props = {
  summary?: CustomerPortalPricingSummary | null;
  /** When no saved line items (legacy booking), show this as TOTAL. */
  totalFallback: number;
};

export function CustomerBookingPaymentSummary({ summary, totalFallback }: Props) {
  if (!summary) {
    return (
      <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment</p>
        <div className="flex justify-between font-semibold text-base">
          <span>TOTAL</span>
          <span>{fmt(totalFallback)}</span>
        </div>
      </div>
    );
  }

  const displayTotal = summary.total > 0 ? summary.total : totalFallback;

  return (
    <div className="rounded-xl border bg-muted/30 p-4 space-y-3 text-sm">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment summary</p>
      <div className="space-y-2">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Service Total</span>
          <span className="font-medium tabular-nums">{fmt(summary.effectiveServiceTotal)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Extras Total</span>
          <span className="font-medium tabular-nums">{fmt(summary.extrasSubtotal)}</span>
        </div>
        {summary.partialCleaningDiscount > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Partial Cleaning Discount</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
              -{fmt(summary.partialCleaningDiscount)}
            </span>
          </div>
        )}
        {summary.frequencyDiscount > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Frequency Discount</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
              -{fmt(summary.frequencyDiscount)}
            </span>
          </div>
        )}
        {summary.couponDiscount > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Coupon Discount</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
              -{fmt(summary.couponDiscount)}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Tax</span>
          <span className="font-medium tabular-nums">{fmt(summary.tax)}</span>
        </div>
        <div className="border-t pt-2 mt-1" />
        <div className="flex justify-between font-semibold text-base gap-4">
          <span>TOTAL</span>
          <span className="tabular-nums">{fmt(displayTotal)}</span>
        </div>
      </div>
    </div>
  );
}
