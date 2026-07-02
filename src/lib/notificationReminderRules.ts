export type ReminderRecipientType = "provider" | "admin" | "customer";

export type BookingReminderRule = {
  /** Matches `business_notification_templates.name` (case-insensitive). */
  templateName: string;
  /** Key stored on `bookings.notification_reminders_sent`. */
  sentKey: string;
  /** Minutes before booking start to send. Null = non time-offset rules. */
  offsetMinutes: number | null;
  recipientType: ReminderRecipientType;
  /** Booking must have an assigned provider. */
  requiresAssignedProvider: boolean;
  /** Booking must be unassigned (no provider_id). */
  unassignedOnly?: boolean;
};

/** Known booking reminder notifications (admin, provider, customer). */
export const BOOKING_REMINDER_NOTIFICATIONS: BookingReminderRule[] = [
  {
    templateName: "Job reminders",
    sentKey: "admin_job_reminders",
    offsetMinutes: 24 * 60,
    recipientType: "admin",
    requiresAssignedProvider: true,
  },
  {
    templateName: "Booking reminder",
    sentKey: "customer_booking_reminder",
    offsetMinutes: 24 * 60,
    recipientType: "customer",
    requiresAssignedProvider: false,
  },
  {
    templateName: "Booking reminder 2",
    sentKey: "customer_booking_reminder_2",
    offsetMinutes: 48 * 60,
    recipientType: "customer",
    requiresAssignedProvider: false,
  },
  {
    templateName: "One day reminder",
    sentKey: "provider_one_day_reminder",
    offsetMinutes: 24 * 60,
    recipientType: "provider",
    requiresAssignedProvider: true,
  },
  {
    templateName: "One hour reminder",
    sentKey: "provider_one_hour_reminder",
    offsetMinutes: 60,
    recipientType: "provider",
    requiresAssignedProvider: true,
  },
  {
    templateName: "Reminder for job in unassigned folder",
    sentKey: "provider_unassigned_folder_reminder",
    offsetMinutes: 24 * 60,
    recipientType: "provider",
    requiresAssignedProvider: false,
    unassignedOnly: true,
  },
];

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function findBookingReminderRule(templateName: string): BookingReminderRule | null {
  const target = normalizeName(templateName);
  return BOOKING_REMINDER_NOTIFICATIONS.find((r) => normalizeName(r.templateName) === target) ?? null;
}

/**
 * Parse how many minutes before a booking start a reminder should fire, based on the
 * notification description text (e.g. "starts in 24 hours", "starts in 1 hour").
 */
export function parseReminderOffsetMinutesFromDescription(description: string): number | null {
  const text = description.trim().toLowerCase();
  if (!text) return null;

  const comingUpMatch = text.match(/coming up in (\d+)\s*hours?/);
  if (comingUpMatch) return Number(comingUpMatch[1]) * 60;

  const startsInMatch = text.match(/starts in (\d+)\s*hours?/);
  if (startsInMatch) return Number(startsInMatch[1]) * 60;

  const startsInHourMatch = text.match(/starts in (\d+)\s*hour\b/);
  if (startsInHourMatch) return Number(startsInHourMatch[1]) * 60;

  const beforeMatch = text.match(/(\d+)\s*hours?\s+before/);
  if (beforeMatch) return Number(beforeMatch[1]) * 60;

  const beforeHourMatch = text.match(/(\d+)\s*hour\s+before/);
  if (beforeHourMatch) return Number(beforeHourMatch[1]) * 60;

  if (/\b48\s*hours?\b/.test(text)) return 48 * 60;
  if (/\b1\s*hour\b/.test(text) && !/\b24\s*hours?\b/.test(text)) return 60;
  if (/\b24\s*hours?\b/.test(text)) return 24 * 60;

  return null;
}

export function resolveReminderOffsetMinutes(
  rule: BookingReminderRule,
  description?: string | null,
): number | null {
  const fromDescription = description ? parseReminderOffsetMinutesFromDescription(description) : null;
  if (fromDescription != null) return fromDescription;
  return rule.offsetMinutes;
}

/** True when booking start is within the send window for this offset. */
export function isWithinReminderWindow(
  minutesUntilStart: number,
  offsetMinutes: number,
  windowMinutes: number,
): boolean {
  if (minutesUntilStart <= 0) return false;
  const lower = offsetMinutes - windowMinutes;
  const upper = offsetMinutes + windowMinutes;
  return minutesUntilStart > lower && minutesUntilStart <= upper;
}
