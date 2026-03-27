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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Replace `{{var_name}}` in template with values. Values are HTML-escaped by default.
 */
export function substituteEmailPlaceholders(
  template: string,
  vars: Record<string, string | number | undefined | null>,
  options?: { escapeValues?: boolean }
): string {
  const escape = options?.escapeValues !== false;
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    const val = v == null ? '' : String(v);
    const safe = escape ? escapeHtml(val) : val;
    const re = new RegExp(`\\{\\{\\s*${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'g');
    out = out.replace(re, safe);
  }
  return out;
}

/** Plain text with newlines → minimal HTML for Resend. */
export function plainTextToEmailHtml(plain: string): string {
  const escaped = escapeHtml(plain);
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;">${escaped.replace(/\r?\n/g, '<br/>')}</body></html>`;
}

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
