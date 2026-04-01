/**
 * Minutes contributed by an industry extra row (API uses `time_minutes`; admin UI may use `time`).
 */
export function minutesFromIndustryExtra(extra: { time?: unknown; time_minutes?: unknown }): number {
  if (typeof extra.time === "number" && extra.time > 0) return extra.time;
  const tm = positiveMinutes(extra.time_minutes);
  if (tm != null) return tm;
  return 0;
}

/** Positive finite minutes from a scalar, or null. */
export function positiveMinutes(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function minutesFromCustomization(c: unknown): number | null {
  if (!c || typeof c !== "object" || Array.isArray(c)) return null;
  const o = c as Record<string, unknown>;
  const fromCust = positiveMinutes(o.duration_minutes ?? o.durationMinutes);
  if (fromCust != null) return fromCust;
  const unitRaw = o.duration_unit ?? o.durationUnit;
  const durRaw = o.duration;
  if (durRaw != null && String(durRaw).trim() !== "") {
    const dv = parseFloat(String(durRaw));
    if (!Number.isNaN(dv) && dv > 0) {
      const unit = String(unitRaw ?? "Hours").toLowerCase();
      const mins = unit.includes("min") ? Math.round(dv) : Math.round(dv * 60);
      return mins > 0 ? mins : null;
    }
  }
  return null;
}

/**
 * Job length in minutes from booking row fields and optional customization JSON
 * (column may be empty while duration lives only in customization).
 */
export function resolveBookingDurationMinutes(b: {
  duration_minutes?: unknown;
  durationMinutes?: unknown;
  customization?: unknown;
}): number | null {
  const r = b as Record<string, unknown>;
  const direct = positiveMinutes(b.duration_minutes ?? r.duration_minutes ?? r.durationMinutes);
  if (direct != null) return direct;
  return minutesFromCustomization(b.customization);
}

/**
 * Parse minutes from public booking POST bodies (customer, guest, Stripe intent payload).
 * Coerces string/number `duration_minutes`, parses `duration` + `duration_unit`, then customization.
 * Returns 0 when unknown (callers gate on `> 0` before writing the DB column).
 */
export function parseDurationMinutesFromBookingPayload(body: Record<string, unknown>): number {
  const fromDm = positiveMinutes(body.duration_minutes ?? body.durationMinutes);
  if (fromDm != null) return fromDm;

  if (body.duration != null && String(body.duration).trim() !== "") {
    const dv = parseFloat(String(body.duration));
    const unit = String(body.duration_unit ?? body.durationUnit ?? "Hours").toLowerCase();
    if (!Number.isNaN(dv) && dv > 0) {
      const mins = unit.includes("min") ? Math.round(dv) : Math.round(dv * 60);
      if (mins > 0) return mins;
    }
  }

  return minutesFromCustomization(body.customization) ?? 0;
}

/**
 * Parse admin UI labels like "2-3 hours", "4-6 hours", or "3 hours" into approximate minutes (midpoint for ranges).
 */
export function approximateMinutesFromDurationLabel(raw: unknown): number | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;
  const rangeHours = s.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*hours?/);
  if (rangeHours) {
    const a = parseFloat(rangeHours[1]);
    const b = parseFloat(rangeHours[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) {
      return Math.round(((a + b) / 2) * 60);
    }
  }
  const singleHour = s.match(/(\d+(?:\.\d+)?)\s*hours?/);
  if (singleHour) {
    const h = parseFloat(singleHour[1]);
    if (Number.isFinite(h) && h > 0) return Math.round(h * 60);
  }
  const rangeMin = s.match(/(\d+)\s*-\s*(\d+)\s*mins?/);
  if (rangeMin) {
    const a = parseInt(rangeMin[1], 10);
    const b = parseInt(rangeMin[2], 10);
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) return Math.round((a + b) / 2);
  }
  const singleMin = s.match(/(\d+)\s*mins?/);
  if (singleMin) {
    const m = parseInt(singleMin[1], 10);
    if (Number.isFinite(m) && m > 0) return m;
  }
  return null;
}
