"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export default function SubscriptionPlansPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Subscription plans</CardTitle>
          </div>
          <CardDescription>View or change your plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Current plan: Starter (placeholder)</p>
            <div className="flex gap-2">
              <Button variant="outline">Manage Plan</Button>
              <Button style={{ background: 'linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)', color: 'white' }}>Upgrade</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
