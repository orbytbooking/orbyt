/** Stored on `industry_service_category.minimum_time` (jsonb). */
export type ServiceCategoryMinimumTime = {
  enabled?: boolean;
  hours?: string;
  minutes?: string;
  textToDisplay?: boolean;
  noticeText?: string;
};

/** Minimum duration in whole minutes when enforcement applies; null if off or misconfigured (0 min). */
export function minimumTimeRequiredMinutes(mt: ServiceCategoryMinimumTime | null | undefined): number | null {
  if (!mt?.enabled) return null;
  const h = Math.max(0, parseInt(String(mt.hours ?? "0"), 10) || 0);
  const m = Math.max(0, parseInt(String(mt.minutes ?? "0"), 10) || 0);
  const total = h * 60 + m;
  return total > 0 ? total : null;
}

export function minimumTimeCustomerMessage(mt: ServiceCategoryMinimumTime, fallback: string): string {
  if (mt.textToDisplay && String(mt.noticeText ?? "").trim()) {
    return String(mt.noticeText).trim();
  }
  return fallback;
}
