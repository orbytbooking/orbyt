/** Browser-only funnel list; keys must match `OnboardingTab` / hiring onboarding UI. */

export const HIRING_FUNNELS_LS_PREFIX = "hiringFunnels";

export type HiringFunnelListItem = { id: string; name: string };

export function hiringFunnelsStorageKey(businessId: string): string {
  return `${HIRING_FUNNELS_LS_PREFIX}:${businessId}`;
}

export function readHiringFunnelsFromLocalStorage(businessId: string): HiringFunnelListItem[] {
  if (typeof window === "undefined") {
    return [{ id: "default", name: "Onboarding funnel" }];
  }
  try {
    const raw = localStorage.getItem(hiringFunnelsStorageKey(businessId));
    const parsed = JSON.parse(raw || "null");
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter(
        (x: unknown): x is HiringFunnelListItem =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as HiringFunnelListItem).id === "string" &&
          typeof (x as HiringFunnelListItem).name === "string",
      );
    }
  } catch {
    // fall through
  }
  return [{ id: "default", name: "Onboarding funnel" }];
}
