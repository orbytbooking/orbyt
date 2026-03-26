/** Small standalone module (avoids Turbopack named-import issues with draftQuoteLogs in some route chunks). */

export function normalizeExpiryDateValue(d: unknown): string | null {
  if (d == null || d === "") return null;
  const s = String(d).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export function formatExpiryDateForActivityLog(d: string | null | undefined): string {
  if (d == null || String(d).trim() === "") return "—";
  const raw = String(d).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "—";
  const [y, m, day] = raw.split("-").map(Number);
  const mm = String(m).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${mm}/${dd}/${y}`;
}

export function shortBookingRefForExpiryLog(bookingId: string): string {
  return bookingId.replace(/-/g, "").slice(-6).toUpperCase();
}

export function describeDraftQuoteExpiryChange(
  bookingId: string,
  prior: string | null | undefined,
  next: string | null | undefined,
  actorName: string
): string {
  const ref = shortBookingRefForExpiryLog(bookingId);
  const from = formatExpiryDateForActivityLog(prior);
  const to = formatExpiryDateForActivityLog(next);
  return `#${ref} - expiry date changed from ${from} to ${to} by ${actorName}`;
}
