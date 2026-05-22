"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const money = (n: number) => `$${n.toFixed(2)}`;

export type CustomerCheckoutPaymentLines = {
  effectiveServiceTotal: number;
  extrasSubtotal: number;
  partialCleaningDiscount: number;
  frequencyDiscount: number;
  couponDiscount: number;
  tax: number;
  taxLabel: string;
  taxesEnabled: boolean;
  total: number;
};

type Props = CustomerCheckoutPaymentLines & {
  className?: string;
  totalClassName?: string;
  /** e.g. frequency discount applied from 2nd booking */
  frequencyDiscountPendingHint?: ReactNode;
};

/** Live book-now / checkout payment breakdown (not persisted booking portal view). */
export function CustomerBookingCheckoutPaymentSummary({
  effectiveServiceTotal,
  extrasSubtotal,
  partialCleaningDiscount,
  frequencyDiscount,
  couponDiscount,
  tax,
  taxLabel,
  taxesEnabled,
  total,
  className,
  totalClassName,
  frequencyDiscountPendingHint,
}: Props) {
  return (
    <div className={cn("space-y-3 text-sm", className)}>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Service Total</span>
        <span className="font-medium">{money(effectiveServiceTotal)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Extras Total</span>
        <span className="font-medium">{money(extrasSubtotal)}</span>
      </div>
      {partialCleaningDiscount > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Partial Cleaning Discount</span>
          <span className="font-medium text-green-600">-{money(partialCleaningDiscount)}</span>
        </div>
      )}
      {frequencyDiscount > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Frequency Discount</span>
          <span className="font-medium text-green-600">-{money(frequencyDiscount)}</span>
        </div>
      )}
      {frequencyDiscountPendingHint}
      {couponDiscount > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Coupon Discount</span>
          <span className="font-medium text-green-600">-{money(couponDiscount)}</span>
        </div>
      )}
      {taxesEnabled && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">{taxLabel.trim() || "Tax"}</span>
          <span className="font-medium">{money(tax)}</span>
        </div>
      )}
      <div className="border-t pt-2 mt-2" />
      <div className={cn("flex justify-between font-semibold text-base", totalClassName)}>
        <span>TOTAL</span>
        <span>{money(total)}</span>
      </div>
    </div>
  );
}

