"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Invoices</CardTitle>
          </div>
          <CardDescription>Download or view past invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No invoices yet. This is a placeholder.</div>
        </CardContent>
      </Card>
    </div>
  );
}
