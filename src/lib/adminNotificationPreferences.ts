export const EMAIL_FREQUENCY_VALUES = ['instant', 'hourly', 'daily', 'weekly'] as const;
export type EmailFrequency = (typeof EMAIL_FREQUENCY_VALUES)[number];

export type AdminNotificationPreferences = {
  emailBookings: boolean;
  emailCancellations: boolean;
  emailPayments: boolean;
  smsReminders: boolean;
  pushNotifications: boolean;
  senderEmail: string | null;
  displayName: string | null;
  adminEmail: string | null;
  replyToEmail: string | null;
  quietHours: boolean;
  emailFrequency: EmailFrequency;
};

export const DEFAULT_ADMIN_NOTIFICATION_PREFERENCES: AdminNotificationPreferences = {
  emailBookings: true,
  emailCancellations: true,
  emailPayments: true,
  smsReminders: false,
  pushNotifications: true,
  senderEmail: null,
  displayName: null,
  adminEmail: null,
  replyToEmail: null,
  quietHours: false,
  emailFrequency: 'instant',
};

export function readStoredPreferences(config: unknown): AdminNotificationPreferences {
  if (!config || typeof config !== 'object') return { ...DEFAULT_ADMIN_NOTIFICATION_PREFERENCES };
  const stored = (config as Record<string, unknown>).adminNotificationPreferences;
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_ADMIN_NOTIFICATION_PREFERENCES };
  const raw = stored as Record<string, unknown>;
  const emailFrequency = EMAIL_FREQUENCY_VALUES.includes(raw.emailFrequency as EmailFrequency)
    ? (raw.emailFrequency as EmailFrequency)
    : DEFAULT_ADMIN_NOTIFICATION_PREFERENCES.emailFrequency;

  return {
    emailBookings:
      typeof raw.emailBookings === 'boolean'
        ? raw.emailBookings
        : DEFAULT_ADMIN_NOTIFICATION_PREFERENCES.emailBookings,
    emailCancellations:
      typeof raw.emailCancellations === 'boolean'
        ? raw.emailCancellations
        : DEFAULT_ADMIN_NOTIFICATION_PREFERENCES.emailCancellations,
    emailPayments:
      typeof raw.emailPayments === 'boolean'
        ? raw.emailPayments
        : DEFAULT_ADMIN_NOTIFICATION_PREFERENCES.emailPayments,
    smsReminders:
      typeof raw.smsReminders === 'boolean'
        ? raw.smsReminders
        : DEFAULT_ADMIN_NOTIFICATION_PREFERENCES.smsReminders,
    pushNotifications:
      typeof raw.pushNotifications === 'boolean'
        ? raw.pushNotifications
        : DEFAULT_ADMIN_NOTIFICATION_PREFERENCES.pushNotifications,
    senderEmail: typeof raw.senderEmail === 'string' ? raw.senderEmail.trim() || null : null,
    displayName: typeof raw.displayName === 'string' ? raw.displayName.trim() || null : null,
    adminEmail: typeof raw.adminEmail === 'string' ? raw.adminEmail.trim() || null : null,
    replyToEmail: typeof raw.replyToEmail === 'string' ? raw.replyToEmail.trim() || null : null,
    quietHours:
      typeof raw.quietHours === 'boolean'
        ? raw.quietHours
        : DEFAULT_ADMIN_NOTIFICATION_PREFERENCES.quietHours,
    emailFrequency,
  };
}

export function mergeAdminNotificationPreferences(
  existing: AdminNotificationPreferences,
  body: Record<string, unknown>,
): AdminNotificationPreferences {
  const next = { ...existing };

  if ('emailBookings' in body) next.emailBookings = Boolean(body.emailBookings);
  if ('emailCancellations' in body) next.emailCancellations = Boolean(body.emailCancellations);
  if ('emailPayments' in body) next.emailPayments = Boolean(body.emailPayments);
  if ('smsReminders' in body) next.smsReminders = Boolean(body.smsReminders);
  if ('pushNotifications' in body) next.pushNotifications = Boolean(body.pushNotifications);
  if ('quietHours' in body) next.quietHours = Boolean(body.quietHours);

  if ('senderEmail' in body) {
    next.senderEmail = typeof body.senderEmail === 'string' ? body.senderEmail.trim() || null : null;
  }
  if ('displayName' in body) {
    next.displayName = typeof body.displayName === 'string' ? body.displayName.trim() || null : null;
  }
  if ('adminEmail' in body) {
    next.adminEmail = typeof body.adminEmail === 'string' ? body.adminEmail.trim() || null : null;
  }
  if ('replyToEmail' in body) {
    next.replyToEmail = typeof body.replyToEmail === 'string' ? body.replyToEmail.trim() || null : null;
  }
  if ('emailFrequency' in body && typeof body.emailFrequency === 'string') {
    if (EMAIL_FREQUENCY_VALUES.includes(body.emailFrequency as EmailFrequency)) {
      next.emailFrequency = body.emailFrequency as EmailFrequency;
    }
  }

  return next;
}
