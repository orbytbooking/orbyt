/** Custom status labels per business + funnel; stored in this browser (same pattern as funnel columns). */

export const DEFAULT_FUNNEL_STATUS_LABELS = ["Done", "Waiting", "In progress"] as const;

function customLabelsStorageKey(businessId: string, funnelId: string): string {
  return `hiringFunnelCustomStatusLabels:${businessId}:${funnelId}`;
}

export function readCustomFunnelStatusLabels(businessId: string, funnelId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(customLabelsStorageKey(businessId, funnelId));
    const parsed = JSON.parse(raw || "null");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.slice(0, 80));
  } catch {
    return [];
  }
}

export function allFunnelStatusLabelOptions(businessId: string, funnelId: string): string[] {
  const base = [...DEFAULT_FUNNEL_STATUS_LABELS];
  for (const extra of readCustomFunnelStatusLabels(businessId, funnelId)) {
    if (!base.some((b) => b.toLowerCase() === extra.toLowerCase())) base.push(extra);
  }
  return base;
}

export function appendCustomFunnelStatusLabel(businessId: string, funnelId: string, label: string): void {
  if (typeof window === "undefined") return;
  const t = label.trim().slice(0, 80);
  if (!t) return;
  const defaults = DEFAULT_FUNNEL_STATUS_LABELS as readonly string[];
  if (defaults.some((d) => d.toLowerCase() === t.toLowerCase())) return;
  const cur = readCustomFunnelStatusLabels(businessId, funnelId);
  if (cur.some((c) => c.toLowerCase() === t.toLowerCase())) return;
  const next = [...cur, t].slice(0, 40);
  localStorage.setItem(customLabelsStorageKey(businessId, funnelId), JSON.stringify(next));
}
