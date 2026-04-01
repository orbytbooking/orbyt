/**
 * Stable sort key for a booking row's scheduled slot (date + time).
 * Uses numeric timestamps so ordering is correct for ISO dates and mixed time formats.
 */
export function bookingScheduleMs(b: {
  date?: string | null;
  time?: string | null;
}): number {
  const d = String(b?.date ?? "").trim();
  const tRaw = String(b?.time ?? "").trim();
  if (!d) return 0;

  let t = tRaw || "00:00:00";
  const parts = t.split(":");
  if (parts.length === 2) {
    t = `${t}:00`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const ms = Date.parse(`${d}T${t}`);
    if (!Number.isNaN(ms)) return ms;
  }

  const combined = d.includes("T") ? d : `${d} ${t}`;
  let ms = Date.parse(combined);
  if (!Number.isNaN(ms)) return ms;
  ms = Date.parse(d);
  return Number.isNaN(ms) ? 0 : ms;
}

/** Earliest scheduled slot first (ascending by date, then time). */
export function compareBookingsByScheduleAsc(
  a: { date?: string | null; time?: string | null },
  b: { date?: string | null; time?: string | null },
): number {
  return bookingScheduleMs(a) - bookingScheduleMs(b);
}

/** Latest scheduled slot first (descending by date, then time). */
export function compareBookingsByScheduleDesc(
  a: { date?: string | null; time?: string | null },
  b: { date?: string | null; time?: string | null },
): number {
  return bookingScheduleMs(b) - bookingScheduleMs(a);
}
