"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { List } from "lucide-react";

export default function LogsPage() {
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
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <p>Logs content coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
