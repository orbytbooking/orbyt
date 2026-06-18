import {
  DEFAULT_ADMIN_NOTIFICATION_PREFERENCES,
  mergeAdminNotificationPreferences,
  readStoredPreferences,
} from '../src/lib/adminNotificationPreferences.ts';

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.error(`  FAIL  ${name}`);
  }
}

const stored = readStoredPreferences({
  adminNotificationPreferences: {
    emailBookings: false,
    senderEmail: 'hello@example.com',
    quietHours: true,
    emailFrequency: 'daily',
  },
});

assert('readStoredPreferences merges defaults', stored.emailCancellations === true);
assert('readStoredPreferences reads booleans', stored.emailBookings === false);
assert('readStoredPreferences reads strings', stored.senderEmail === 'hello@example.com');
assert('readStoredPreferences reads quietHours', stored.quietHours === true);
assert('readStoredPreferences reads emailFrequency', stored.emailFrequency === 'daily');

const mergedFromSettingsPage = mergeAdminNotificationPreferences(stored, {
  emailBookings: true,
  emailPayments: false,
});

assert('settings page partial save preserves senderEmail', mergedFromSettingsPage.senderEmail === 'hello@example.com');
assert('settings page partial save updates emailBookings', mergedFromSettingsPage.emailBookings === true);
assert('settings page partial save updates emailPayments', mergedFromSettingsPage.emailPayments === false);
assert('settings page partial save preserves quietHours', mergedFromSettingsPage.quietHours === true);

const mergedFromNotificationsPage = mergeAdminNotificationPreferences(stored, {
  senderEmail: 'notify@tenant.com',
  displayName: 'Tenant Co',
  adminEmail: 'admin@tenant.com',
  replyToEmail: 'reply@tenant.com',
  quietHours: false,
  emailFrequency: 'weekly',
});

assert('notifications page save updates senderEmail', mergedFromNotificationsPage.senderEmail === 'notify@tenant.com');
assert('notifications page save updates displayName', mergedFromNotificationsPage.displayName === 'Tenant Co');
assert('notifications page save updates emailFrequency', mergedFromNotificationsPage.emailFrequency === 'weekly');
assert('notifications page save preserves emailBookings when omitted', mergedFromNotificationsPage.emailBookings === false);

const emptyConfig = readStoredPreferences(null);
assert('empty config uses defaults', emptyConfig.emailFrequency === DEFAULT_ADMIN_NOTIFICATION_PREFERENCES.emailFrequency);

console.log('');
console.log(`Summary: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
