"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SchedulingSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/settings/general?tab=scheduling");
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-[300px]">
      <p className="text-sm text-muted-foreground">Redirecting to General settings…</p>
    </div>
  );
}
