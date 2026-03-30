"use client";

import { useEffect, useState } from "react";

function readIanaTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * Browser-detected IANA timezone (e.g. America/Chicago) after mount.
 * Returns undefined on the first render (and on SSR) so DayPicker omits `timeZone` until then —
 * avoids server HTML using a mismatched zone during hydration. All roles (customer / provider / admin)
 * use the same hook via `@/components/ui/calendar`.
 */
export function useAutoIanaTimeZone(): string | undefined {
  const [tz, setTz] = useState<string | undefined>(undefined);
  useEffect(() => {
    setTz(readIanaTimeZone());
  }, []);
  return tz;
}
