"use client";

import { Suspense } from "react";
import IndustryBookingTemplatePage from "../_components/IndustryBookingTemplatePage";
import { Loader2 } from "lucide-react";

function BookingTemplateFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function IndustryBookingTemplateRoutePage() {
  return (
    <Suspense fallback={<BookingTemplateFallback />}>
      <IndustryBookingTemplatePage />
    </Suspense>
  );
}
