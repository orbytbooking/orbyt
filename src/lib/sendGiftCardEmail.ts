import { Resend } from 'resend';
import { isPublicGiftCardImageUrl } from '@/lib/giftCardEmailImage';

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
  /** Public HTTPS URL only — email clients cannot render data URLs or cid attachments reliably. */
  imageUrl?: string | null;
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cssBackgroundUrl(url: string): string {
  return url.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function buildGiftCardFaceContent(data: GiftCardEmailPayload, amountStr: string): string {
  return `
        <p style="margin:0 0 8px;font-size:14px;opacity:0.95;">🎁 Gift Card</p>
        <h1 style="margin:0 0 8px;font-size:28px;line-height:1.2;font-weight:700;">Congratulations!</h1>
        <p style="margin:0 0 20px;font-size:15px;opacity:0.95;">You&apos;ve received a special gift</p>
        <p style="margin:0 0 8px;font-size:40px;line-height:1;font-weight:700;">$${amountStr}</p>
        <p style="margin:0 0 24px;font-size:14px;opacity:0.95;">${escapeHtml(data.giftCardName)}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
          style="border-top:1px solid rgba(255,255,255,0.25);">
          <tr>
            <td align="left" style="font-size:13px;color:#ffffff;padding-top:16px;">To: ${escapeHtml(data.recipientName)}</td>
            <td align="right" style="font-size:13px;color:#ffffff;padding-top:16px;">From: ${escapeHtml(data.purchaserName)}</td>
          </tr>
        </table>`;
}

/** Gift card face — image as background with text overlay (matches Send Gift Card preview). */
function buildGiftCardFace(data: GiftCardEmailPayload): string {
  const amountStr = data.amount.toFixed(2);
  const imageUrl = isPublicGiftCardImageUrl(data.imageUrl) ? data.imageUrl!.trim() : '';
  const faceContent = buildGiftCardFaceContent(data, amountStr);

  if (imageUrl) {
    const safeUrl = cssBackgroundUrl(imageUrl);
    return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"
      style="max-width:560px;margin:0 auto;border-collapse:collapse;border-radius:12px;overflow:hidden;">
      <tr>
        <td align="center" valign="middle" width="560" background="${escapeHtml(imageUrl)}"
          style="width:100%;max-width:560px;padding:0;text-align:center;color:#ffffff;background-color:#111827;
            background-image:url('${safeUrl}');background-size:cover;background-position:center center;background-repeat:no-repeat;">
          <div style="padding:32px 24px;background-color:rgba(0,0,0,0.45);min-height:256px;
            box-sizing:border-box;display:block;">
            ${faceContent}
          </div>
        </td>
      </tr>
    </table>`;
  }

  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"
    style="max-width:560px;margin:0 auto;border-collapse:collapse;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="background:linear-gradient(135deg,#f472b6,#db2777);padding:32px 24px;text-align:center;color:#ffffff;">
        ${faceContent}
      </td>
    </tr>
  </table>`;
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
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;">
         <tr>
           <td align="center">
             <a href="${escapeHtml(bookUrl)}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;background:#0ea5e9;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:16px;">
               Book now
             </a>
           </td>
         </tr>
       </table>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background:#f3f4f6;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
    ${buildGiftCardFace(data)}
    <div style="padding:28px 24px;">
      <p style="margin:0 0 16px;">Hi ${escapeHtml(data.recipientName)},</p>
      <p style="margin:0 0 20px;">${escapeHtml(data.purchaserName)} sent you a <strong>${escapeHtml(data.giftCardName)}</strong> gift card worth <strong>$${amountStr}</strong> from ${escapeHtml(data.businessName)}.</p>
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
    console.log('Image URL:', data.imageUrl ?? '(none)');
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
