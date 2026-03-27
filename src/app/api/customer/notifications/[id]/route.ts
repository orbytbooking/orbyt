import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromBearer } from '@/lib/bearer-auth';
import {
  markPlatformAnnouncementReadForUser,
  parsePlatformNotificationId,
} from '@/lib/platform-announcement-notifications';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromBearer(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = String(user.user_metadata?.role ?? '').toLowerCase();
    if (role !== 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });

    const annId = parsePlatformNotificationId(id);
    if (!annId) {
      return NextResponse.json({ error: 'Invalid notification' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await markPlatformAnnouncementReadForUser(supabase, user.id, annId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Customer notification PATCH:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context);
}
