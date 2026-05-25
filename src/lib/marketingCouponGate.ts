/**
 * Validates `marketing_coupons.coupon_config` from Admin → Marketing → Coupons
 * against a concrete booking context (book-now, admin add booking, etc.).
 */

export type MarketingCouponLimitations = {
  applicableDays?: string[];
  useSpecificDate?: boolean;
  specificDates?: string[];
  applyOneTime?: boolean;
  applyRecurring?: boolean;
  /** Enforced server-side via `/api/guest/marketing-coupon-scope` (book-now + admin add booking). */
  customerScope?: "all" | "new" | "existing";
  singleUsePerUser?: boolean;
};

export type MarketingCouponConfig = {
  formEnabled?: boolean;
  formEnabledByIndustry?: Record<string, boolean>;
  industryEnabled?: Record<string, boolean>;
  selectedServices?: string[];
  selectedServicesByIndustry?: Record<string, string[]>;
  selectedLocations?: string[];
  selectedLocationsByIndustry?: Record<string, string[]>;
  /**
   * How many location rows existed in admin when the coupon was saved (per industry).
   * Used to detect “all locations” vs a subset: internal area names often won’t appear in the
   * customer’s address/zip, so we must not require a substring match when every area was selected.
   */
  locationOptionsCountByIndustry?: Record<string, number>;
  limitations?: MarketingCouponLimitations;
};

export type MarketingCouponGateContext = {
  /** Industry display name; must match keys in coupon_config (same as admin industries). */
  industryLabel: string;
  serviceName: string;
  /** Local calendar date for day-of-week / specific-date rules. */
  bookingDate: Date | null;
  /** Frequency label from booking UI (e.g. "One-time", "Weekly"). */
  frequencyLabel: string;
  /** Zip or location name entered for the booking (trimmed). */
  locationCandidate: string;
  /**
   * When set (including `[]`), location subset rules compare coupon picks to these labels
   * from `location_zip_codes` / industry locations (same strings as Marketing → coupons).
   * When omitted, subset rules fall back to matching `locationCandidate` text only.
   */
  resolvedLocationLabels?: string[];
};

function trimStrings(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim());
}

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isOneTimeFrequency(label: string): boolean {
  const t = label.trim().toLowerCase().replace(/\s+/g, " ");
  if (!t) return true;
  return t === "one-time" || t === "one time" || t === "onetime";
}

function industryAllowed(
  industryLabel: string,
  industryEnabled: Record<string, boolean> | undefined,
  formEnabledByIndustry: Record<string, boolean> | undefined
): boolean {
  if (!industryLabel) return true;
  if (industryEnabled && Object.prototype.hasOwnProperty.call(industryEnabled, industryLabel)) {
    if (industryEnabled[industryLabel] === false) return false;
  }
  if (formEnabledByIndustry && Object.prototype.hasOwnProperty.call(formEnabledByIndustry, industryLabel)) {
    if (formEnabledByIndustry[industryLabel] === false) return false;
  }
  return true;
}

function industryContributesServices(
  industryKey: string,
  industryEnabled: Record<string, boolean> | undefined,
  formEnabledByIndustry: Record<string, boolean> | undefined
): boolean {
  if (industryEnabled && Object.prototype.hasOwnProperty.call(industryEnabled, industryKey)) {
    if (industryEnabled[industryKey] === false) return false;
  }
  if (formEnabledByIndustry && Object.prototype.hasOwnProperty.call(formEnabledByIndustry, industryKey)) {
    if (formEnabledByIndustry[industryKey] === false) return false;
  }
  return true;
}

function collectApplicableServiceNames(
  c: MarketingCouponConfig,
  industryLabel: string
): string[] {
  const legacy = trimStrings(c.selectedServices);
  const byInd = c.selectedServicesByIndustry;
  const ie = c.industryEnabled;
  const fe = c.formEnabledByIndustry;
  const ind = industryLabel.trim();

  if (byInd && typeof byInd === "object" && ind && Array.isArray(byInd[ind])) {
    if (!industryContributesServices(ind, ie, fe)) return legacy;
    return Array.from(new Set([...legacy, ...trimStrings(byInd[ind])]));
  }

  if (byInd && typeof byInd === "object") {
    const merged: string[] = [...legacy];
    for (const [key, services] of Object.entries(byInd)) {
      if (!industryContributesServices(key, ie, fe)) continue;
      if (Array.isArray(services)) merged.push(...trimStrings(services));
    }
    return Array.from(new Set(merged));
  }

  return Array.from(new Set(legacy));
}

function collectApplicableLocationNames(c: MarketingCouponConfig, industryLabel: string): string[] {
  const legacy = trimStrings(c.selectedLocations);
  const byInd = c.selectedLocationsByIndustry;
  const ind = industryLabel.trim();
  if (byInd && typeof byInd === "object" && ind && Array.isArray(byInd[ind])) {
    return Array.from(new Set([...legacy, ...trimStrings(byInd[ind])]));
  }
  if (byInd && typeof byInd === "object") {
    const merged = [...legacy];
    for (const services of Object.values(byInd)) {
      if (Array.isArray(services)) merged.push(...trimStrings(services));
    }
    return Array.from(new Set(merged));
  }
  return Array.from(new Set(legacy));
}

function locationMatches(candidateRaw: string, allowed: string[]): boolean {
  const candidate = candidateRaw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!candidate) return false;
  return allowed.some((loc) => {
    const L = loc.trim().toLowerCase().replace(/\s+/g, " ");
    if (!L) return false;
    return L === candidate || candidate.includes(L) || L.includes(candidate);
  });
}

function couponLabelsOverlapResolved(allowed: string[], resolved: string[]): boolean {
  return allowed.some((a) => {
    const A = a.trim().toLowerCase().replace(/\s+/g, " ");
    if (!A) return false;
    return resolved.some((r) => {
      const R = r.trim().toLowerCase().replace(/\s+/g, " ");
      if (!R) return false;
      return A === R || R.includes(A) || A.includes(R);
    });
  });
}

/**
 * Only enforce address/zip substring matching when we know the coupon uses a **subset** of areas.
 * Legacy configs without `locationOptionsCountByIndustry` skip this (those labels rarely match customers).
 */
export function shouldEnforceMarketingCouponLocationSubset(
  couponConfig: unknown,
  industryLabel: string
): boolean {
  const c = couponConfig as MarketingCouponConfig | null | undefined;
  if (!c || typeof c !== "object") return false;
  return shouldEnforceLocationSubsetMatch(c, industryLabel);
}

function shouldEnforceLocationSubsetMatch(c: MarketingCouponConfig, industryLabel: string): boolean {
  const counts = c.locationOptionsCountByIndustry;
  if (!counts || typeof counts !== "object" || Object.keys(counts).length === 0) {
    return false;
  }
  const ind = industryLabel.trim();
  if (!ind) return false;
  const total = counts[ind];
  if (typeof total !== "number" || total <= 0) return false;
  const byInd = c.selectedLocationsByIndustry;
  const picked = ind && byInd && Array.isArray(byInd[ind]) ? trimStrings(byInd[ind]) : [];
  if (picked.length === 0) return false;
  if (picked.length >= total) return false;
  return true;
}

/**
 * Returns a user-facing error, or null if the coupon config allows this booking context.
 */
export function getMarketingCouponGateFailure(
  couponConfig: unknown,
  ctx: MarketingCouponGateContext
): { title: string; description: string } | null {
  const c = couponConfig as MarketingCouponConfig | null | undefined;
  if (!c || typeof c !== "object") return null;

  if (c.formEnabled === false) {
    return { title: "Coupon unavailable", description: "This coupon is currently disabled." };
  }

  const formEnabledByIndustry = c.formEnabledByIndustry;
  if (formEnabledByIndustry && typeof formEnabledByIndustry === "object") {
    const keys = Object.keys(formEnabledByIndustry);
    if (keys.length > 0) {
      const anyEnabled = Object.values(formEnabledByIndustry).some((v) => v === true);
      if (!anyEnabled) {
        return { title: "Coupon unavailable", description: "This coupon is currently disabled." };
      }
    }
  }

  const ind = ctx.industryLabel.trim();
  if (ind) {
    if (!industryAllowed(ind, c.industryEnabled, c.formEnabledByIndustry)) {
      return {
        title: "Coupon not valid for this industry",
        description: "This coupon does not apply to the selected industry.",
      };
    }
  }

  const applicableServices = collectApplicableServiceNames(c, ind);
  if (applicableServices.length > 0) {
    const serviceName = ctx.serviceName.trim();
    if (!serviceName) {
      return {
        title: "Select a service",
        description: "Choose a service before applying this coupon.",
      };
    }
    const want = serviceName.toLowerCase();
    const ok = applicableServices.some((s) => s.trim().toLowerCase() === want);
    if (!ok) {
      return {
        title: "Coupon not valid for this service",
        description: "This coupon cannot be applied to the selected service.",
      };
    }
  }

  const locs = collectApplicableLocationNames(c, ind);
  if (shouldEnforceLocationSubsetMatch(c, ind) && locs.length > 0) {
    if (ctx.resolvedLocationLabels !== undefined) {
      if (ctx.resolvedLocationLabels.length === 0) {
        return {
          title: "Coupon not valid for this location",
          description:
            "Your zip or service area is not in a location allowed for this coupon. Use a zip or area that belongs to this business’s service locations.",
        };
      }
      if (!couponLabelsOverlapResolved(locs, ctx.resolvedLocationLabels)) {
        return {
          title: "Coupon not valid for this location",
          description: "This coupon only applies in certain service locations for this business.",
        };
      }
    } else {
      const cand = ctx.locationCandidate.trim();
      if (!cand) {
        return {
          title: "Address or zip required",
          description: "Enter a service address or zip before applying this coupon.",
        };
      }
      if (!locationMatches(ctx.locationCandidate, locs)) {
        return {
          title: "Coupon not valid for this location",
          description: "Enter a service address or zip that matches an allowed location for this coupon.",
        };
      }
    }
  }

  const lim = c.limitations;
  if (lim && typeof lim === "object") {
    const bookingDate = ctx.bookingDate;
    if (bookingDate && !Number.isNaN(bookingDate.getTime())) {
      const days = lim.applicableDays;
      if (Array.isArray(days) && days.length > 0) {
        const weekday = bookingDate.toLocaleDateString("en-US", { weekday: "long" });
        const dayOk = days.some((d) => typeof d === "string" && d.toLowerCase() === weekday.toLowerCase());
        if (!dayOk) {
          return {
            title: "Coupon not valid on this day",
            description: "This coupon cannot be used on the selected service day.",
          };
        }
      }

      if (lim.useSpecificDate && Array.isArray(lim.specificDates) && lim.specificDates.length > 0) {
        const ymd = formatLocalYmd(bookingDate);
        const dateOk = lim.specificDates.some((d) => String(d).slice(0, 10) === ymd);
        if (!dateOk) {
          return {
            title: "Coupon not valid on this date",
            description: "This coupon only applies on specific dates chosen by the business.",
          };
        }
      }
    }

    const freq = ctx.frequencyLabel.trim();
    if (freq) {
      const one = isOneTimeFrequency(freq);
      const allowOne = lim.applyOneTime !== false;
      const allowRec = lim.applyRecurring !== false;
      if (!allowOne && one) {
        return {
          title: "Coupon not valid for one-time bookings",
          description: "This coupon only applies to recurring bookings.",
        };
      }
      if (!allowRec && !one) {
        return {
          title: "Coupon not valid for recurring bookings",
          description: "This coupon only applies to one-time bookings.",
        };
      }
    }
  }

  return null;
}
