/**
 * Send a test email using a real row from business_notification_templates.
 * Usage:
 *   npx tsx scripts/test-notification-template-email.mjs [recipient@email.com] [template name]
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  resolvePublicAssetUrls,
  substituteEmailPlaceholders,
} from '../src/lib/emailTemplatePlaceholders.ts';
import { buildProviderScheduleTableHtml } from '../src/lib/sendProviderSchedule.ts';

function loadDotEnv() {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const apiKey = process.env.RESEND_API_KEY?.trim();
const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
const rawAppBase = (process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const appBase = /localhost|127\.0\.0\.1/i.test(rawAppBase)
  ? 'https://www.orbytservice.com'
  : rawAppBase;

const to = (process.argv[2] || process.env.TEST_EMAIL_TO || 'abejayofracio@gmail.com').trim();
const templateNameFilter = (process.argv[3] || '').trim().toLowerCase();

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!apiKey || !fromEmail) {
  console.error('Missing RESEND_API_KEY or RESEND_FROM_EMAIL');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const { data: templates, error: tplErr } = await supabase
  .from('business_notification_templates')
  .select('id, business_id, name, subject, body, enabled, is_default')
  .order('is_default', { ascending: false })
  .order('enabled', { ascending: false })
  .order('created_at', { ascending: false });

if (tplErr) {
  console.error('Failed to load templates:', tplErr.message);
  process.exit(1);
}

const withBody = (templates ?? []).filter((t) => String(t.body ?? '').trim());
if (withBody.length === 0) {
  console.error('No notification templates found in database.');
  process.exit(1);
}

let template = withBody.find((t) => t.is_default && t.enabled !== false);
if (templateNameFilter) {
  const named = withBody.find((t) => String(t.name ?? '').trim().toLowerCase() === templateNameFilter);
  if (named) template = named;
  else {
    console.error(`Template "${process.argv[3]}" not found. Available:`);
    for (const t of withBody) console.error(`  - ${t.name}${t.is_default ? ' (default)' : ''}`);
    process.exit(1);
  }
}
if (!template) {
  template = withBody.find((t) => t.enabled !== false) ?? withBody[0];
}

console.log('\nUsing database template:');
console.log('  Name:     ', template.name);
console.log('  ID:       ', template.id);
console.log('  Business: ', template.business_id);
console.log('  Default:  ', template.is_default ? 'yes' : 'no');
console.log('  Enabled:  ', template.enabled !== false ? 'yes' : 'no');

const { data: business } = await supabase
  .from('businesses')
  .select('name, website, logo_url, business_email, business_phone, currency')
  .eq('id', template.business_id)
  .maybeSingle();

const siteUrl =
  business?.website && /^https?:\/\//i.test(String(business.website))
    ? String(business.website).replace(/\/$/, '')
    : appBase;

const businessName = business?.name || 'Your Business';
const currency = business?.currency || 'USD';
const isSendSchedule = String(template.name ?? '').trim().toLowerCase() === 'send schedule';
const scheduleStart = '2026-06-20';
const scheduleEnd = '2026-06-26';
const formatScheduleDate = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};
const sampleScheduleBookings = [
  {
    id: '00000000-0000-0000-0000-0000123456',
    scheduled_date: '2026-06-21',
    scheduled_time: '09:00:00',
    customer_name: 'Jane Customer',
    service: 'Deep Cleaning',
    address: '123 Main St, Springfield',
    total_price: 149.5,
  },
  {
    id: '00000000-0000-0000-0000-0000654321',
    scheduled_date: '2026-06-23',
    scheduled_time: '14:30:00',
    customer_name: 'John Smith',
    service: 'Standard Clean',
    address: '456 Oak Ave, Springfield',
    total_price: 99,
  },
];

const vars = {
  email_body: isSendSchedule
    ? buildProviderScheduleTableHtml(sampleScheduleBookings, currency)
    : '<p style="margin:0 0 12px;">This is a test email generated from your saved notification template <strong>' +
      String(template.name).replace(/</g, '') +
      '</strong>.</p>',
  provider_name: 'Alex Provider',
  customer_name: isSendSchedule ? 'Alex Provider' : 'Jane Customer',
  business_name: businessName,
  business_logo_url: business?.logo_url || `${appBase}/images/logo.png`,
  support_email: business?.business_email || 'support@orbytservice.com',
  support_phone: business?.business_phone || '+1 (555) 000-0000',
  store_currency: currency,
  schedule_start: formatScheduleDate(scheduleStart),
  schedule_end: formatScheduleDate(scheduleEnd),
  booking_count: isSendSchedule ? String(sampleScheduleBookings.length) : '1',
  service: isSendSchedule ? `${sampleScheduleBookings.length} bookings` : 'Deep Cleaning',
  date: 'Tuesday, April 14, 2026',
  time: '14:30',
  address: '123 Main St, Springfield',
  booking_ref: 'BK-123456',
  total_price: '99.00',
  total_price_formatted: '$99.00',
  invoice_number: 'INV-1001',
  total_amount: '149.50',
  total_amount_formatted: '$149.50',
  due_date: 'May 1, 2026',
  issue_date: 'April 1, 2026',
  description: 'Test from saved template',
  line_summary: 'Service: $99.00',
  view_url: `${appBase}/invoice/sample-token`,
  site_url: siteUrl,
};

const subjectTemplate = String(template.subject ?? '').trim() || `Test — ${template.name}`;
const bodyTemplate = String(template.body ?? '').trim();

const renderedSubject = substituteEmailPlaceholders(subjectTemplate, vars);
const renderedHtml = resolvePublicAssetUrls(
  substituteEmailPlaceholders(bodyTemplate, vars, {
    escapeValues: true,
    htmlUnescapedKeys: ['email_body'],
  }),
  appBase,
);

console.log('\nRendered subject:', renderedSubject);
console.log('Sending to:', to);
console.log('From:', fromEmail);

const resend = new Resend(apiKey);
const { data, error } = await resend.emails.send({
  from: fromEmail,
  to: [to],
  subject: renderedSubject,
  html: renderedHtml,
  replyTo: (business?.business_email || '').trim() || undefined,
});

if (error) {
  console.error('\nFAIL — Resend error:', error.message || error);
  process.exit(1);
}

console.log('\nPASS — Resend accepted. Email id:', data?.id);

if (data?.id) {
  await new Promise((r) => setTimeout(r, 2000));
  const statusRes = await fetch(`https://api.resend.com/emails/${data.id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (statusRes.ok) {
    const statusBody = await statusRes.json();
    console.log('Delivery status:', statusBody.last_event || statusBody.status || 'unknown');
  }
}

console.log('\nCheck inbox for the email from template:', template.name);
