import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminUser, getAuthenticatedUser, createServiceRoleClient, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/** Create a support ticket. Body: { business_id, subject, message, priority?, requester_email? }. */
export async function POST(request: NextRequest) {
  const user = await getSuperAdminUser();
  if (!user) {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return createUnauthorizedResponse();
    return createForbiddenResponse('Not a super admin');
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const business_id = body.business_id?.toString()?.trim();
    const subject = body.subject?.toString()?.trim();
    const message = body.message?.toString()?.trim();
    if (!business_id || !subject || !message) {
      return NextResponse.json({ error: 'business_id, subject, and message are required' }, { status: 400 });
    }
    const priority = ['low', 'medium', 'high'].includes((body.priority || 'medium').toString().toLowerCase())
      ? (body.priority as string).toString().toLowerCase()
      : 'medium';
    const requester_email = body.requester_email?.toString()?.trim() || user.email || undefined;

    const { data: ticket, error } = await admin
      .from('support_tickets')
      .insert({
        business_id,
        subject,
        message,
        priority,
        status: 'open',
        requester_email,
      })
      .select('id, business_id, subject, message, priority, status, requester_email, assigned_to, created_at, updated_at')
      .single();

    if (error) {
      console.error('Support ticket create error:', error);
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }
    return NextResponse.json(ticket);
  } catch (e) {
    console.error('Support ticket create error:', e);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
