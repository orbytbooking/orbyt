"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
function LegacySettingsRedirect() {
  const router = useRouter();
  const industryId = useSearchParams().get("industryId")?.trim() || "";

  useEffect(() => {
    if (industryId) {
      router.replace(
        `/admin/settings/industries/booking-template?industryId=${encodeURIComponent(industryId)}`,
      );
    }
  }, [industryId, router]);

  if (industryId) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Opening form template…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Industry settings</CardTitle>
          <CardDescription>
            Booking form templates now live on the dedicated page. Add an industry to be redirected there automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/admin/settings/industries">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Industries
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function IndustrySettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LegacySettingsRedirect />
    </Suspense>
  );
}
