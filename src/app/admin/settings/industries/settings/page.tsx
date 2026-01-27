"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function IndustrySettingsPage() {
  const params = useSearchParams();
  const industry = params.get("industry") || "Industry";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{industry} - Settings</CardTitle>
          <CardDescription>General settings for this industry.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input id="display-name" defaultValue={industry} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder={`${industry.toLowerCase().replace(/\s+/g, '-')}`} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={3} placeholder={`Describe ${industry} here`} />
          </div>
          <div className="flex gap-2">
            <Button variant="default">Save</Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
