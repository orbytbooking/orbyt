"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AddBookingForm } from "@/components/admin/AddBookingForm";
import { cn } from "@/lib/utils";

type EditBookingSheetProps = {
  bookingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

export function EditBookingSheet({ bookingId, open, onOpenChange, onSaved }: EditBookingSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex w-full flex-col gap-0 border-l border-slate-200 bg-white p-0 text-slate-900 shadow-xl",
          "h-screen max-h-screen overflow-hidden",
          "sm:max-w-none sm:w-[min(1400px,96vw)]",
          "[&>button]:text-slate-500 [&>button]:hover:text-slate-800",
          /* Light panel in portal (no dark/admin-theme — avoids forcing void styling) */
        )}
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-slate-200 bg-slate-50 px-6 pb-4 pt-6 text-left">
          <SheetTitle className="text-lg font-bold text-slate-900">Edit booking</SheetTitle>
          <SheetDescription className="text-slate-600">
            Review the summary and update booking details. Nothing is applied until you save.
            {bookingId ? (
              <span className="mt-1 block font-mono text-xs text-slate-500">Booking ID · {bookingId}</span>
            ) : null}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/80 px-4 py-4 sm:px-6 overscroll-contain">
          {bookingId ? (
            <AddBookingForm
              key={bookingId}
              embedded
              bookingIdOverride={bookingId}
              onClose={() => onOpenChange(false)}
              onSaved={() => {
                onSaved?.();
                onOpenChange(false);
              }}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
