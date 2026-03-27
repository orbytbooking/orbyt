import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromBearer } from '@/lib/bearer-auth';
import {
  getPlatformOnlyNotificationsForUser,
  markAllVisiblePlatformAnnouncementsReadForUser,
  platformViewerKindFromUser,
} from '@/lib/platform-announcement-notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getUserFromBearer(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = String(user.user_metadata?.role ?? '').toLowerCase();
    if (role !== 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const viewer = platformViewerKindFromUser(user);
    const merged = await getPlatformOnlyNotificationsForUser(supabase, user.id, viewer);

    return NextResponse.json({
      notifications: merged.map((n) => ({
        id: n.id,
        title: n.title,
        description: n.description,
        read: n.read,
        created_at: n.created_at,
        link: n.link,
        source: n.source,
        level: n.level ?? null,
        audience: n.audience ?? null,
      })),
    });
  } catch (e) {
    console.error('Customer notifications GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromBearer(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = String(user.user_metadata?.role ?? '').toLowerCase();
    if (role !== 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const viewer = platformViewerKindFromUser(user);
    await markAllVisiblePlatformAnnouncementsReadForUser(supabase, user.id, viewer);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Customer notifications PATCH:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
