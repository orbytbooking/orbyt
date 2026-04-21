/**
 * Maps industry_frequency.frequency_repeats (kebab-case) to JS Date.getDay(): 0 Sun … 6 Sat.
 * Used for customer date-picker rules and by recurring occurrence logic (see recurringBookings).
 * Keep keys aligned with admin `frequencies/new` SelectItem values (incl. `monthly`).
 */
export const FREQUENCY_REPEAT_WEEKDAY_PATTERNS: Record<string, number[]> = {
  "every-mon-fri": [1, 5],
  "every-mon-wed-fri": [1, 3, 5],
  "every-tue-thu": [2, 4],
  "sat-sun": [0, 6],
  "every-tue-wed-fri": [2, 3, 5],
  "every-mon-wed": [1, 3],
  "every-mon-thu": [1, 4],
};

export function normalizeFrequencyRepeatKey(raw: string | null | undefined): string {
  return (raw || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/_/g, "-");
}

/**
 * Weekdays allowed for the first service date from admin **Frequency repeats every** (`industry_frequency.frequency_repeats`),
 * or `null` when the dropdown choice does not restrict weekdays (e.g. every week, every N weeks, plain daily).
 * Not gated on occurrence type — the stored repeat pattern is the source of truth.
 */
export function getAllowedWeekdaysForFrequencyRepeatsEvery(
  frequencyRepeats: string | null | undefined,
): number[] | null {
  const repeats = normalizeFrequencyRepeatKey(frequencyRepeats);
  if (!repeats) return null;

  const weekdays = FREQUENCY_REPEAT_WEEKDAY_PATTERNS[repeats];
  if (weekdays?.length) return weekdays;

  if (repeats === "daily-no-sat-sun") return [1, 2, 3, 4, 5];
  if (repeats === "daily-no-sun") return [1, 2, 3, 4, 5, 6];

  return null;
}
