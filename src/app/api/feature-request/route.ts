import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const FEATURE_REQUEST_TO_EMAIL = 'orbytbooking@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, email } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Feature title is required' }, { status: 400 });
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
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
    const replyTo = email && typeof email === 'string' && email.trim() ? email.trim() : undefined;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #1e293b;">New feature request from Orbyt Service</h2>
        <p><strong>Title:</strong> ${escapeHtml(title.trim())}</p>
        ${replyTo ? `<p><strong>From (optional):</strong> ${escapeHtml(replyTo)}</p>` : ''}
        <p><strong>Description:</strong></p>
        <div style="margin-top: 12px; padding: 12px; background: #f1f5f9; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(description.trim())}</div>
        <p style="margin-top: 20px; color: #64748b; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [FEATURE_REQUEST_TO_EMAIL],
      ...(replyTo && { replyTo }),
      subject: `[Feature Request] ${title.trim().slice(0, 60)}${title.trim().length > 60 ? '...' : ''}`,
      html,
    });

    if (error) {
      console.error('Feature request Resend error:', error);
      return NextResponse.json({ error: 'Failed to submit. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Feature request submitted successfully' });
  } catch (err) {
    console.error('Feature request error:', err);
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
