"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { Loader2, Clock, Users, Bell } from "lucide-react";

type SchedulingType = "accepted_automatically" | "accept_or_decline" | "accepts_same_day_only";

interface StoreOptions {
  id?: string;
  business_id?: string;
  scheduling_type: SchedulingType;
  accept_decline_timeout_minutes: number;
  providers_can_see_unassigned: boolean;
  providers_can_see_all_unassigned: boolean;
  notify_providers_on_unassigned: boolean;
  waitlist_enabled: boolean;
  clock_in_out_enabled: boolean;
}

const DEFAULT_OPTIONS: StoreOptions = {
  scheduling_type: "accepted_automatically",
  accept_decline_timeout_minutes: 60,
  providers_can_see_unassigned: true,
  providers_can_see_all_unassigned: false,
  notify_providers_on_unassigned: true,
  waitlist_enabled: false,
  clock_in_out_enabled: false,
};

export default function SchedulingSettingsPage() {
  const { currentBusiness } = useBusiness();
  const [options, setOptions] = useState<StoreOptions>(DEFAULT_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchOptions = async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/store-options?businessId=${currentBusiness.id}`, {
        headers: { "x-business-id": currentBusiness.id },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setOptions(data.options ? { ...DEFAULT_OPTIONS, ...data.options } : DEFAULT_OPTIONS);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load scheduling settings");
      setOptions(DEFAULT_OPTIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentBusiness?.id) fetchOptions();
  }, [currentBusiness?.id]);

  const handleSave = async () => {
    if (!currentBusiness?.id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/store-options", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-business-id": currentBusiness.id },
        body: JSON.stringify({ ...options, businessId: currentBusiness.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setOptions(data.options ? { ...DEFAULT_OPTIONS, ...data.options } : options);
      toast.success("Scheduling settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Scheduling</h1>
        <p className="text-muted-foreground mt-1">
          Configure how providers are assigned to bookings (Booking Koala style)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Provider Assignment
          </CardTitle>
          <CardDescription>
            Choose how bookings get assigned to providers when customers book online
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Scheduling type</Label>
            <div className="grid gap-3">
              <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                <input
                  type="radio"
                  name="scheduling_type"
                  checked={options.scheduling_type === "accepted_automatically"}
                  onChange={() => setOptions((o) => ({ ...o, scheduling_type: "accepted_automatically" }))}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">Accepted Automatically</p>
                  <p className="text-sm text-muted-foreground">
                    Bookings are auto-assigned by availability and priority. Customer gets confirmation immediately.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                <input
                  type="radio"
                  name="scheduling_type"
                  checked={options.scheduling_type === "accept_or_decline"}
                  onChange={() => setOptions((o) => ({ ...o, scheduling_type: "accept_or_decline" }))}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">Accept or Decline</p>
                  <p className="text-sm text-muted-foreground">
                    Invitations go to providers in priority order. Customer only gets confirmation after a provider accepts.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                <input
                  type="radio"
                  name="scheduling_type"
                  checked={options.scheduling_type === "accepts_same_day_only"}
                  onChange={() => setOptions((o) => ({ ...o, scheduling_type: "accepts_same_day_only" }))}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">Accepts Same Day Only</p>
                  <p className="text-sm text-muted-foreground">
                    Future bookings auto-assign; same-day bookings require provider acceptance.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {(options.scheduling_type === "accept_or_decline" ||
            options.scheduling_type === "accepts_same_day_only") && (
            <div className="space-y-2">
              <Label>Provider response timeout (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={1440}
                value={options.accept_decline_timeout_minutes}
                onChange={(e) =>
                  setOptions((o) => ({
                    ...o,
                    accept_decline_timeout_minutes: Math.max(5, Math.min(1440, parseInt(e.target.value, 10) || 60)),
                  }))
                }
              />
              <p className="text-sm text-muted-foreground">
                How long each provider has to accept before the next one is invited
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Unassigned Folder
          </CardTitle>
          <CardDescription>
            Settings for bookings without a provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow providers to see unassigned jobs</Label>
              <p className="text-sm text-muted-foreground">Providers can grab jobs from the unassigned folder</p>
            </div>
            <Switch
              checked={options.providers_can_see_unassigned}
              onCheckedChange={(v) => setOptions((o) => ({ ...o, providers_can_see_unassigned: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Show all unassigned jobs to providers</Label>
              <p className="text-sm text-muted-foreground">Override provider filters (locations, industries) for unassigned</p>
            </div>
            <Switch
              checked={options.providers_can_see_all_unassigned}
              onCheckedChange={(v) => setOptions((o) => ({ ...o, providers_can_see_all_unassigned: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notify providers when new unassigned job
              </Label>
              <p className="text-sm text-muted-foreground">Send notification when a booking enters the unassigned folder</p>
            </div>
            <Switch
              checked={options.notify_providers_on_unassigned}
              onCheckedChange={(v) => setOptions((o) => ({ ...o, notify_providers_on_unassigned: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Waitlist for customers</Label>
              <p className="text-sm text-muted-foreground">Let customers request times when no slots are available</p>
            </div>
            <Switch
              checked={options.waitlist_enabled}
              onCheckedChange={(v) => setOptions((o) => ({ ...o, waitlist_enabled: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Tracking
          </CardTitle>
          <CardDescription>
            Enable clock in/out for providers (On the Way, At Location, Clock In, Clock Out)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable clock in/out</Label>
              <p className="text-sm text-muted-foreground">Providers can track job time via the provider dashboard</p>
            </div>
            <Switch
              checked={options.clock_in_out_enabled}
              onCheckedChange={(v) => setOptions((o) => ({ ...o, clock_in_out_enabled: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save Settings
      </Button>
    </div>
  );
}
