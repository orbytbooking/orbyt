"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export function BillingWorldpay() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Worldpay</CardTitle>
        <CardDescription>
          Online booking payments will be processed through Worldpay when this provider is selected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">Worldpay selected</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Customer payments from online checkout will use the platform’s Worldpay integration. If you need to use your own Worldpay merchant account, contact support to configure it.
        </p>
      </CardContent>
    </Card>
  );
}
