import { redirect } from 'next/navigation';

/** Old route: inbox lives under Dashboard → Notifications → Activity inbox. */
export default function SuperAdminNotificationsRedirectPage() {
  redirect('/super-admin/dashboard?tab=notifications&notif_inbox=1');
}
