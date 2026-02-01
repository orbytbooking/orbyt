"use client";

import { Separator } from '@/components/ui/separator';

export default function GeneralSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">General</h3>
        <p className="text-sm text-muted-foreground">
          Manage your general account settings and preferences.
        </p>
      </div>
      <Separator />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <div className="flex-1">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              General settings form will be implemented here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
