import { NextResponse } from 'next/server';
import {
  markPlatformAnnouncementReadForUser,
  parsePlatformNotificationId,
  parseSupportNotificationId,
} from '@/lib/platform-announcement-notifications';
import { requireSuperAdminGate } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;
  const { user, admin } = gate;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });

  if (parseSupportNotificationId(id)) {
    return NextResponse.json({ ok: true });
  }

  const annId = parsePlatformNotificationId(id);
  if (!annId) {
    return NextResponse.json({ error: 'Invalid notification' }, { status: 400 });
  }

  await markPlatformAnnouncementReadForUser(admin, user.id, annId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context);
}
