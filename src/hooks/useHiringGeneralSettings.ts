import { useCallback, useEffect, useState } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import {
  DEFAULT_HIRING_GENERAL_SETTINGS,
  type HiringGeneralSettings,
} from "@/lib/hiring-general-settings";

export function useHiringGeneralSettings() {
  const { currentBusiness } = useBusiness();
  const [settings, setSettings] = useState<HiringGeneralSettings>(DEFAULT_HIRING_GENERAL_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!currentBusiness?.id) {
      setSettings(DEFAULT_HIRING_GENERAL_SETTINGS);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hiring/settings/general", {
        credentials: "include",
        headers: { "x-business-id": currentBusiness.id },
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; settings?: HiringGeneralSettings };
      if (!res.ok) throw new Error(json.error || "Failed to load hiring settings");
      if (json.settings && typeof json.settings === "object") {
        setSettings(json.settings);
      } else {
        setSettings(DEFAULT_HIRING_GENERAL_SETTINGS);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load hiring settings");
      setSettings(DEFAULT_HIRING_GENERAL_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, error, refetch: fetchSettings };
}
