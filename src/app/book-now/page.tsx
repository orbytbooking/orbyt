"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import BookingPageContent from "./BookingPageContent";

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading booking form...</p>
          </div>
        </div>
      }
    >
      <BookingPageContent />
    </Suspense>
  );
}
