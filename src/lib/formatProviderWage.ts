/**
 * Display string for booking provider wage (admin summaries, aligned with provider portal).
 */
export function formatProviderWageDisplay(
  wage: number | null | undefined,
  wageType: string | null | undefined
): string | null {
  if (wage == null || !Number.isFinite(Number(wage))) return null;
  const w = Number(wage);
  if (w < 0) return null;
  if (w === 0) return null;
  const t = (wageType ?? "").toString().trim().toLowerCase();
  if (t === "percentage") return `${w}%`;
  if (t === "hourly") return `$${w.toFixed(2)}/hr`;
  if (t === "fixed") return `$${w.toFixed(2)}`;
  return `$${w.toFixed(2)}`;
}
