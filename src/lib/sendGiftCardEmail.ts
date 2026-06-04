import { Resend } from 'resend';

export type GiftCardEmailPayload = {
  recipientEmail: string;
  recipientName: string;
  purchaserName: string;
  businessName: string;
  giftCardName: string;
  amount: number;
  uniqueCode: string;
  expiresAt: string;
  message?: string | null;
  bookNowUrl?: string | null;
};

function formatExpiresAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function buildGiftCardEmailHtml(data: GiftCardEmailPayload): string {
  const amountStr = data.amount.toFixed(2);
  const expiresStr = formatExpiresAt(data.expiresAt);
  const messageBlock = data.message?.trim()
    ? `<div style="background:#f8f9fa;border-radius:8px;padding:16px;margin:20px 0;">
         <p style="margin:0 0 8px;font-size:14px;color:#666;">Personal message:</p>
         <p style="margin:0;font-style:italic;color:#333;">${escapeHtml(data.message.trim())}</p>
       </div>`
    : '';

  const bookUrl = (data.bookNowUrl ?? '').trim();
  const ctaBlock = bookUrl
    ? `<p style="text-align:center;margin:24px 0;">
         <a href="${escapeHtml(bookUrl)}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;">Book now</a>
       </p>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background:#f3f4f6;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#ec4899,#db2777);color:#fff;padding:32px 24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:14px;opacity:0.9;">🎁 Gift Card</p>
      <h1 style="margin:0;font-size:26px;">Congratulations!</h1>
      <p style="margin:8px 0 0;opacity:0.9;">You've received a special gift from ${escapeHtml(data.businessName)}</p>
    </div>
    <div style="padding:28px 24px;">
      <p style="margin:0 0 16px;">Hi ${escapeHtml(data.recipientName)},</p>
      <p style="margin:0 0 20px;">${escapeHtml(data.purchaserName)} sent you a <strong>${escapeHtml(data.giftCardName)}</strong> gift card worth <strong>$${amountStr}</strong>.</p>
      ${messageBlock}
      <div style="text-align:center;background:#fdf2f8;border:2px dashed #ec4899;border-radius:10px;padding:24px;margin:24px 0;">
        <p style="margin:0 0 8px;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:1px;">Your code</p>
        <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:4px;font-family:ui-monospace,monospace;color:#be185d;">${escapeHtml(data.uniqueCode)}</p>
        <p style="margin:12px 0 0;font-size:14px;color:#666;">Valid until ${escapeHtml(expiresStr)}</p>
      </div>
      <p style="margin:0 0 8px;font-weight:600;">How to use your gift card:</p>
      <ol style="margin:0;padding-left:20px;color:#444;">
        <li>Save your gift card code: <strong>${escapeHtml(data.uniqueCode)}</strong></li>
        <li>When booking, open the <strong>Gift Cards</strong> tab and enter your code</li>
        <li>The balance is applied to your order total</li>
        <li>Any remaining balance can be used on future bookings</li>
      </ol>
      ${ctaBlock}
    </div>
    <div style="padding:16px 24px;background:#f9fafb;text-align:center;font-size:12px;color:#888;">
      <p style="margin:0;">This email was sent by ${escapeHtml(data.businessName)}.</p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Send gift card notification; logs to console if Resend is not configured. */
export async function sendGiftCardEmail(data: GiftCardEmailPayload): Promise<boolean> {
  const to = data.recipientEmail.trim();
  if (!to) return false;

  const subject = `You've received a gift card from ${data.businessName}!`;
  const html = buildGiftCardEmailHtml(data);
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || 'noreply@yourdomain.com';

  if (!resendKey) {
    console.log('=== GIFT CARD EMAIL (Resend not configured) ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Code:', data.uniqueCode);
    console.log('Amount:', data.amount);
    console.log('============================================');
    return true;
  }

  try {
    const resend = new Resend(resendKey);
    const { error } = await resend.emails.send({ from, to: [to], subject, html });
    if (error) {
      console.error('Gift card email Resend error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Gift card email failed:', err);
    return false;
  }
}
