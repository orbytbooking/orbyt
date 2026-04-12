/** When hourly service uses "custom time", customer/admin pick hours + minutes on the booking form. */
export function hourlyCustomTimeTotalMinutes(args: {
  hourly?: { enabled?: boolean; priceCalculationType?: string } | null | undefined;
  bookingHours?: string | null | undefined;
  bookingMinutes?: string | null | undefined;
}): number | null {
  const { hourly, bookingHours, bookingMinutes } = args;
  if (!hourly?.enabled) return null;
  if ((hourly.priceCalculationType ?? "customTime") !== "customTime") return null;
  const h = Math.max(0, parseInt(String(bookingHours ?? "0"), 10) || 0);
  const m = Math.max(0, parseInt(String(bookingMinutes ?? "0"), 10) || 0);
  const total = h * 60 + m;
  return total > 0 ? total : null;
}

/**
 * When hourly is enabled and extras are not counted separately, extra line prices are omitted
 * (included in the hourly rate). Time from extras can still apply for pricing-parameters time.
 */
export function hourlyExtrasBillableSubtotal(args: {
  hourly?: { enabled?: boolean; countExtrasSeparately?: boolean } | null | undefined;
  extrasSubtotal: number;
}): number {
  if (!args.hourly?.enabled) return args.extrasSubtotal;
  if (args.hourly.countExtrasSeparately === true) return args.extrasSubtotal;
  return 0;
}
