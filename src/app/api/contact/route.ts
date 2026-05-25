import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const CONTACT_TO_EMAIL = 'orbytbooking@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!resendApiKey) {
      return NextResponse.json({ error: 'Email service is not configured' }, { status: 500 });
    }
    if (!fromEmail) {
      return NextResponse.json({ error: 'Email sender is not configured' }, { status: 500 });
    }

    const resend = new Resend(resendApiKey);

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #1e293b;">New message from Orbyt Service contact form</h2>
        <p><strong>From:</strong> ${escapeHtml(name.trim())}</p>
        <p><strong>Email:</strong> ${escapeHtml(email.trim())}</p>
        <p><strong>Message:</strong></p>
        <div style="margin-top: 12px; padding: 12px; background: #f1f5f9; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(message.trim())}</div>
        <p style="margin-top: 20px; color: #64748b; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [CONTACT_TO_EMAIL],
      replyTo: email.trim(),
      subject: `Orbyt contact: ${name.trim().slice(0, 50)}${name.trim().length > 50 ? '...' : ''}`,
      html,
    });

    if (error) {
      console.error('Contact form Resend error:', error);
      return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Message sent successfully' });
  } catch (err) {
    console.error('Contact form error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m] ?? m);
}
