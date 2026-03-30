"use client";

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { List } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function LogsPage() {
  const searchParams = useSearchParams();
  const bookingId =
    searchParams.get("bookingId")?.trim() ||
    searchParams.get("booking")?.trim() ||
    null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-primary" />
            <CardTitle>Logs</CardTitle>
          </div>
          <CardDescription>
            View system logs and activity history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookingId ? (
            <div className="space-y-2 py-4">
              <p className="text-sm text-muted-foreground">
                Filter context (booking)
              </p>
              <p className="font-mono text-sm break-all">{bookingId}</p>
              <p className="text-sm text-muted-foreground pt-4">
                Full activity logs for this booking are not wired yet; this page confirms the link from booking
                charges or the provider calendar.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p>Logs content coming soon...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
