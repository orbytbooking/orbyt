"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function EarnRewardsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Earn Rewards</CardTitle>
          </div>
          <CardDescription>Configure referral codes and loyalty rewards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Placeholder content for rewards configuration.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
