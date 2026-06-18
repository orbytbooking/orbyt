/**
 * Send a real notification-style test email via Resend and poll delivery status.
 * Usage: node --env-file=.env scripts/test-notification-email.mjs [recipient@email.com]
 */
import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY?.trim();
const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
const to =
  (process.argv[2] || process.env.TEST_EMAIL_TO || process.env.ADMIN_TEST_EMAIL || '').trim();

if (!apiKey || !fromEmail) {
  console.error('Missing RESEND_API_KEY or RESEND_FROM_EMAIL in environment.');
  process.exit(1);
}

if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
  console.error('Pass recipient: node --env-file=.env scripts/test-notification-email.mjs you@example.com');
  process.exit(1);
}

const resend = new Resend(apiKey);
const subject = `Orbyt notification email test — ${new Date().toISOString()}`;
const html = `
  <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
    <h2 style="color:#0891b2;">Orbyt email notification test</h2>
    <p>If you received this, Resend delivery is working for your app configuration.</p>
    <p style="color:#64748b;font-size:14px;">From: ${fromEmail}<br/>Sent at: ${new Date().toLocaleString()}</p>
  </div>
`;

console.log('Sending notification test email...');
console.log('  From:', fromEmail);
console.log('  To:  ', to);

const { data, error } = await resend.emails.send({ from: fromEmail, to: [to], subject, html });

if (error) {
  console.error('Send failed:', error.message || error);
  process.exit(1);
}

const emailId = data?.id;
console.log('Accepted by Resend. Email id:', emailId || '(none)');

if (!emailId) {
  console.log('Send accepted but no id returned — check Resend dashboard.');
  process.exit(0);
}

async function pollStatus(attempts = 8) {
  for (let i = 1; i <= attempts; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.log(`  Poll ${i}: could not fetch status (${res.status})`);
      continue;
    }
    const body = await res.json();
    const status = body.last_event || body.status || JSON.stringify(body);
    console.log(`  Poll ${i}:`, status);
    if (['delivered', 'bounced', 'complained', 'failed'].includes(String(body.last_event))) {
      return body.last_event;
    }
  }
  return 'pending_or_unknown';
}

const finalStatus = await pollStatus();
console.log('');
if (finalStatus === 'delivered') {
  console.log('PASS — Email was delivered. Check the inbox for:', to);
  process.exit(0);
}
if (finalStatus === 'bounced' || finalStatus === 'failed') {
  console.error('FAIL — Email did not deliver. Status:', finalStatus);
  process.exit(1);
}

console.log('PARTIAL — Resend accepted the send. Final delivery status:', finalStatus);
console.log('Check inbox/spam for:', to);
process.exit(0);
