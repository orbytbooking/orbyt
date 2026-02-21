/**
 * Cancellation fee calculation: determines if a fee applies when a booking is cancelled
 * and the amount, using business settings and optionally service category overrides.
 */

export interface BusinessCancellationSettings {
  chargeFee?: 'yes' | 'no';
  feeType?: 'single' | 'multiple';
  feeAmount?: string;
  feeCurrency?: string;
  payProvider?: boolean;
  overrideServiceCategory?: boolean;
  chargeWhen?: 'after_time_day_before' | 'hours_before';
  afterTime?: string;   // e.g. "06:00"
  afterAmPm?: 'AM' | 'PM';
  hoursBefore?: string; // e.g. "24"
  excludeSameDay?: boolean;
  multipleFees?: Array<{
    id: string;
    fee: string;
    currency: string;
    chargeTiming: 'beforeDay' | 'hoursBefore';
    beforeDayTime?: string;
    hoursBefore: string;
  }>;
}

export interface ServiceCategoryCancellationFee {
  enabled?: boolean;
  type?: 'single' | 'multiple';
  fee?: string;
  currency?: string;
  chargeTiming?: 'beforeDay' | 'hoursBefore';
  beforeDayTime?: string;
  hoursBefore?: string;
  multiple_fees?: Array<{
    id: string;
    fee: string;
    currency: string;
    chargeTiming: 'beforeDay' | 'hoursBefore';
    beforeDayTime?: string;
    hoursBefore: string;
  }>;
}

export interface BookingForCancellation {
  scheduled_date?: string | null; // yyyy-mm-dd
  scheduled_time?: string | null; // HH:MM or HH:MM:SS
  date?: string | null;
  time?: string | null;
  service_id?: string | null;
}

export interface CancellationFeeResult {
  amount: number;
  currency: string;
}

/**
 * Parse time string (e.g. "06:00", "6:00 PM") to minutes since midnight.
 */
function parseTimeToMinutes(timeStr: string, amPm?: 'AM' | 'PM'): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10) || 0;
  if (amPm === 'PM' && hours !== 12) hours += 12;
  if (amPm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/**
 * Get the cutoff moment (day before booking at given time) as Date.
 */
function getCutoffDayBefore(bookingDate: string, afterTime: string, afterAmPm: 'AM' | 'PM'): Date {
  const dayBefore = new Date(bookingDate);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  const [h, m] = afterTime.split(':').map((x) => parseInt(x, 10) || 0);
  let hours = h;
  if (afterAmPm === 'PM' && hours !== 12) hours += 12;
  if (afterAmPm === 'AM' && hours === 12) hours = 0;
  dayBefore.setUTCHours(hours, m, 0, 0);
  return dayBefore;
}

/**
 * Get booking start as Date (use scheduled_date/scheduled_time or date/time).
 */
function getBookingStart(booking: BookingForCancellation): Date | null {
  const dateStr = booking.scheduled_date || booking.date;
  const timeStr = booking.scheduled_time || booking.time;
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00Z');
  if (timeStr) {
    const minutes = parseTimeToMinutes(timeStr);
    d.setUTCMinutes(d.getUTCMinutes() + minutes);
  }
  return d;
}

/**
 * Check if the cancellation "now" is within the fee window (fee applies).
 * - after_time_day_before: fee applies if "now" is after [afterTime] [afterAmPm] on the day before the booking.
 * - hours_before: fee applies if "now" is within [hoursBefore] hours of the booking start.
 * - exclude_same_day: if booking is same calendar day as "now", no fee (optional).
 */
function feeAppliesByTiming(
  booking: BookingForCancellation,
  chargeWhen: 'after_time_day_before' | 'hours_before',
  afterTime: string,
  afterAmPm: 'AM' | 'PM',
  hoursBefore: string,
  excludeSameDay: boolean,
  now: Date
): boolean {
  const bookingStart = getBookingStart(booking);
  if (!bookingStart) return true; // no date → apply fee to be safe

  const bookingDateStr = (booking.scheduled_date || booking.date)!.slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);
  if (excludeSameDay && bookingDateStr === todayStr) return false;

  if (chargeWhen === 'hours_before') {
    const hours = parseInt(hoursBefore, 10) || 0;
    const cutoff = new Date(bookingStart.getTime() - hours * 60 * 60 * 1000);
    return now.getTime() >= cutoff.getTime();
  }

  // after_time_day_before: fee applies if now is after that time on the day before
  const cutoff = getCutoffDayBefore(bookingDateStr, afterTime || '00:00', afterAmPm || 'AM');
  return now.getTime() >= cutoff.getTime();
}

function getFeeFromSettings(
  settings: BusinessCancellationSettings,
  booking: BookingForCancellation,
  now: Date
): { amount: number; currency: string } | null {
  const chargeWhen = settings.chargeWhen || 'after_time_day_before';
  const afterTime = settings.afterTime || '06:00';
  const afterAmPm = settings.afterAmPm || 'PM';
  const hoursBefore = settings.hoursBefore || '24';
  const excludeSameDay = !!settings.excludeSameDay;

  if (!feeAppliesByTiming(booking, chargeWhen, afterTime, afterAmPm, hoursBefore, excludeSameDay, now)) {
    return null;
  }

  if (settings.feeType === 'multiple' && settings.multipleFees?.length) {
    // Use first matching fee (or first one); could be extended to match by timeframe
    const first = settings.multipleFees[0];
    const amt = parseFloat(first.fee);
    if (Number.isNaN(amt) || amt < 0) return null;
    return { amount: amt, currency: first.currency || '$' };
  }

  const amt = parseFloat(settings.feeAmount ?? '0');
  if (Number.isNaN(amt) || amt < 0) return null;
  return { amount: amt, currency: settings.feeCurrency || '$' };
}

function getFeeFromCategory(
  cf: ServiceCategoryCancellationFee,
  booking: BookingForCancellation,
  now: Date
): { amount: number; currency: string } | null {
  if (!cf?.enabled) return null;
  const chargeTiming = cf.chargeTiming || 'beforeDay';
  const beforeDayTime = (cf.beforeDayTime || '06:00').trim().replace(/\s*(AM|PM)/i, '').trim() || '06:00';
  const hoursBefore = cf.hoursBefore || '24';
  const afterAmPm: 'AM' | 'PM' = beforeDayTime.startsWith('12') || parseInt(beforeDayTime, 10) < 12 ? 'PM' : 'AM';

  const chargeWhen = chargeTiming === 'hoursBefore' ? 'hours_before' : 'after_time_day_before';
  if (!feeAppliesByTiming(booking, chargeWhen, beforeDayTime, afterAmPm, hoursBefore, false, now)) {
    return null;
  }

  if (cf.type === 'multiple' && cf.multiple_fees?.length) {
    const first = cf.multiple_fees[0];
    const amt = parseFloat(first.fee);
    if (Number.isNaN(amt) || amt < 0) return null;
    return { amount: amt, currency: first.currency || '$' };
  }

  const amt = parseFloat(cf.fee ?? '0');
  if (Number.isNaN(amt) || amt < 0) return null;
  return { amount: amt, currency: cf.currency || '$' };
}

/**
 * Compute the cancellation fee for a booking at "now".
 * Uses business settings; if overrideServiceCategory is false, uses service category cancellation_fee when available.
 */
export function getCancellationFeeForBooking(
  booking: BookingForCancellation,
  businessSettings: BusinessCancellationSettings | null,
  serviceCategoryCancellationFee: ServiceCategoryCancellationFee | null,
  now: Date = new Date()
): CancellationFeeResult | null {
  if (businessSettings?.chargeFee === 'no') return null;
  if (businessSettings?.overrideServiceCategory) {
    return getFeeFromSettings(businessSettings, booking, now);
  }
  if (serviceCategoryCancellationFee?.enabled) {
    return getFeeFromCategory(serviceCategoryCancellationFee, booking, now);
  }
  if (businessSettings?.chargeFee === 'yes') {
    return getFeeFromSettings(businessSettings, booking, now);
  }
  return null;
}
