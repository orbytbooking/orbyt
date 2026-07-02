/**
 * Reschedule fee calculation: determines if a fee applies when a booking is rescheduled
 * and the amount, using business settings (fixed $ or percentage %).
 */

export interface BusinessRescheduleSettings {
  chargeFee?: 'yes' | 'no';
  feeAmount?: string;
  /** '$' for fixed price, '%' for percentage of booking total */
  feeType?: '$' | '%';
  overrideServiceCategory?: boolean;
  considerDate?: boolean;
  considerTime?: boolean;
  considerAnyChanges?: boolean;
  chargeWhen?: 'after_time_day_before' | 'hours_before';
  afterTime?: string;
  afterAmPm?: 'AM' | 'PM';
  hoursBefore?: string;
  excludeSameDay?: boolean;
  chargeMultipleFeesOneDay?: boolean;
  chargeFeeOnPostpone?: boolean;
}

export interface BookingForReschedule {
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  date?: string | null;
  time?: string | null;
  total_price?: number | null;
  amount?: number | null;
}

export interface RescheduleChange {
  dateChanged: boolean;
  timeChanged: boolean;
}

export interface RescheduleFeeResult {
  amount: number;
  currency: string;
  /** '$' flat fee or '%' of booking total */
  feeType: '$' | '%';
  /** Value from admin settings (e.g. 5 for $5 or 10 for 10%) */
  configuredRate: number;
}

export interface ReschedulePolicyDisplay {
  chargeFee: boolean;
  feeType: '$' | '%' | null;
  configuredRate: number | null;
  feeLabel: string | null;
  estimatedFee: number | null;
  disclaimerText: string | null;
}

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10) || 0;
  return hours * 60 + minutes;
}

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

function getBookingStart(booking: BookingForReschedule): Date | null {
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

function feeAppliesByTiming(
  booking: BookingForReschedule,
  chargeWhen: 'after_time_day_before' | 'hours_before',
  afterTime: string,
  afterAmPm: 'AM' | 'PM',
  hoursBefore: string,
  excludeSameDay: boolean,
  now: Date
): boolean {
  const bookingStart = getBookingStart(booking);
  if (!bookingStart) return true;

  const bookingDateStr = (booking.scheduled_date || booking.date)!.slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);
  if (excludeSameDay && bookingDateStr === todayStr) return false;

  if (chargeWhen === 'hours_before') {
    const hours = parseInt(hoursBefore, 10) || 0;
    const cutoff = new Date(bookingStart.getTime() - hours * 60 * 60 * 1000);
    return now.getTime() >= cutoff.getTime();
  }

  const cutoff = getCutoffDayBefore(bookingDateStr, afterTime || '00:00', afterAmPm || 'AM');
  return now.getTime() >= cutoff.getTime();
}

function changeQualifiesAsReschedule(
  settings: BusinessRescheduleSettings,
  change: RescheduleChange
): boolean {
  if (!change.dateChanged && !change.timeChanged) return false;

  if (settings.considerAnyChanges !== false) {
    return change.dateChanged || change.timeChanged;
  }

  if (change.dateChanged && settings.considerDate) return true;
  if (change.timeChanged && !change.dateChanged && settings.considerTime) return true;
  return false;
}

function computeFeeAmount(
  settings: BusinessRescheduleSettings,
  booking: BookingForReschedule
): number | null {
  const feeType = settings.feeType;
  if (feeType !== '$' && feeType !== '%') return null;

  const rawAmount = parseInt(String(settings.feeAmount ?? ''), 10);
  if (!Number.isInteger(rawAmount) || rawAmount <= 0) return null;

  if (feeType === '$') {
    return rawAmount;
  }

  const pct = Math.min(100, rawAmount);
  const total = Number(booking.total_price ?? booking.amount ?? 0);
  if (!Number.isFinite(total) || total <= 0) return null;
  return Math.round((total * pct) / 100 * 100) / 100;
}

/**
 * Compute the reschedule fee for a booking at "now".
 * Fee applies only when chargeFee is yes, amount is set, and feeType is $ or %.
 */
export function getRescheduleFeeForBooking(
  booking: BookingForReschedule,
  businessSettings: BusinessRescheduleSettings | null,
  change: RescheduleChange,
  now: Date = new Date()
): RescheduleFeeResult | null {
  if (businessSettings?.chargeFee !== 'yes') return null;
  if (!changeQualifiesAsReschedule(businessSettings, change)) return null;

  const amount = computeFeeAmount(businessSettings, booking);
  if (amount == null || amount <= 0) return null;

  const chargeWhen = businessSettings.chargeWhen || 'after_time_day_before';
  const afterTime = businessSettings.afterTime || '01:00';
  const afterAmPm = businessSettings.afterAmPm || 'AM';
  const hoursBefore = businessSettings.hoursBefore || '24';
  const excludeSameDay = !!businessSettings.excludeSameDay;

  if (!feeAppliesByTiming(booking, chargeWhen, afterTime, afterAmPm, hoursBefore, excludeSameDay, now)) {
    return null;
  }

  const feeType = businessSettings.feeType === '%' ? '%' : '$';
  const configuredRate = parseInt(String(businessSettings.feeAmount ?? ''), 10);

  return {
    amount,
    currency: '$',
    feeType,
    configuredRate: Number.isInteger(configuredRate) ? configuredRate : amount,
  };
}

/** Customer-facing label and disclaimer from saved admin settings (not a hardcoded amount). */
export function getReschedulePolicyDisplay(
  settings: BusinessRescheduleSettings | null,
  bookingTotal?: number | null,
): ReschedulePolicyDisplay {
  const empty: ReschedulePolicyDisplay = {
    chargeFee: false,
    feeType: null,
    configuredRate: null,
    feeLabel: null,
    estimatedFee: null,
    disclaimerText: null,
  };

  if (settings?.chargeFee !== 'yes') return empty;

  const feeType = settings.feeType === '%' ? '%' : settings.feeType === '$' ? '$' : null;
  const configuredRate = parseInt(String(settings.feeAmount ?? ''), 10);
  if (!feeType || !Number.isInteger(configuredRate) || configuredRate <= 0) return empty;

  if (feeType === '$') {
    return {
      chargeFee: true,
      feeType: '$',
      configuredRate,
      feeLabel: `$${configuredRate}`,
      estimatedFee: configuredRate,
      disclaimerText: `Based on our rescheduling policy, a fee of $${configuredRate} may apply when you change your appointment within the policy window.`,
    };
  }

  const pct = Math.min(100, configuredRate);
  const total = bookingTotal != null ? Number(bookingTotal) : NaN;
  const estimatedFee =
    Number.isFinite(total) && total > 0
      ? Math.round((total * pct) / 100 * 100) / 100
      : null;

  const disclaimerText =
    estimatedFee != null
      ? `Based on our rescheduling policy, a fee of ${pct}% of your booking total ($${estimatedFee.toFixed(2)}) may apply when you change your appointment within the policy window.`
      : `Based on our rescheduling policy, a fee of ${pct}% of your booking total may apply when you change your appointment within the policy window.`;

  return {
    chargeFee: true,
    feeType: '%',
    configuredRate: pct,
    feeLabel: `${pct}%`,
    estimatedFee,
    disclaimerText,
  };
}

/** Message after a fee was applied (uses the configured rate, not a hardcoded amount). */
export function formatAppliedRescheduleFeeMessage(fee: RescheduleFeeResult): string {
  if (fee.feeType === '%') {
    return `Your appointment was updated. A reschedule fee of ${fee.configuredRate}% ($${fee.amount.toFixed(2)}) applies.`;
  }
  return `Your appointment was updated. A reschedule fee of $${fee.amount.toFixed(2)} applies.`;
}

export function detectRescheduleChange(
  before: BookingForReschedule,
  after: BookingForReschedule
): RescheduleChange {
  const beforeDate = (before.scheduled_date || before.date || '').slice(0, 10);
  const afterDate = (after.scheduled_date || after.date || '').slice(0, 10);
  const beforeTime = String(before.scheduled_time || before.time || '').trim();
  const afterTime = String(after.scheduled_time || after.time || '').trim();
  return {
    dateChanged: !!afterDate && beforeDate !== afterDate,
    timeChanged: !!afterTime && beforeTime !== afterTime,
  };
}

/** Apply reschedule_fee_amount/currency on updates when settings qualify. */
export function applyRescheduleFeeFields(
  updates: Record<string, unknown>,
  bookingBefore: BookingForReschedule,
  change: RescheduleChange,
  businessSettings: BusinessRescheduleSettings | null,
  now: Date = new Date()
): RescheduleFeeResult | null {
  const fee = getRescheduleFeeForBooking(bookingBefore, businessSettings, change, now);
  if (fee) {
    updates.reschedule_fee_amount = fee.amount;
    updates.reschedule_fee_currency = fee.currency;
  }
  return fee;
}
