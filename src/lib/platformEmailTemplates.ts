import { createServiceRoleClient } from '@/lib/auth-helpers';

export type PlatformEmailTemplateRow = {
  id: string;
  key: string;
  name: string;
  subject: string;
  body_text: string;
  body_html: string;
  is_active: boolean;
};

/** Documented keys used by EmailService when a matching active template exists. */
export const PLATFORM_EMAIL_TEMPLATE_KEYS = {
  bookingConfirmation: 'booking_confirmation',
  invoice: 'invoice_email',
} as const;

/**
 * Load an active platform email template by key (Super Admin → System email templates).
 * Returns null if missing, inactive, or server misconfigured.
 */
export async function getActivePlatformEmailTemplateByKey(
  key: string
): Promise<PlatformEmailTemplateRow | null> {
  const trimmed = key.trim();
  if (!trimmed) return null;
  const admin = createServiceRoleClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from('platform_email_templates')
    .select('id, key, name, subject, body_text, body_html, is_active')
    .eq('key', trimmed)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) return null;
  return data as PlatformEmailTemplateRow;
}
