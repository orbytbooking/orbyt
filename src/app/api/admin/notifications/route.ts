import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';
import {
  mergeAdminNotificationsWithPlatformAnnouncements,
  markAllVisiblePlatformAnnouncementsReadForUser,
  platformViewerKindFromUser,
} from '@/lib/platform-announcement-notifications';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId, user } = ctx;

    const { searchParams } = new URL(request.url);
    const hinted =
      searchParams.get('business_id')?.trim() ||
      request.headers.get('x-business-id')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { data: notifications, error } = await supabase
      .from('admin_notifications')
      .select('id, title, description, read, created_at, link')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin notifications:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const viewer = platformViewerKindFromUser(user);
    const merged = await mergeAdminNotificationsWithPlatformAnnouncements(
      supabase,
      user.id,
      viewer,
      notifications || []
    );

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
  } catch (err) {
    console.error('Admin notifications GET:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId, user } = ctx;

    const { searchParams } = new URL(request.url);
    const hinted =
      searchParams.get('business_id')?.trim() ||
      request.headers.get('x-business-id')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { error } = await supabase
      .from('admin_notifications')
      .update({ read: true })
      .eq('business_id', businessId);

    if (error) {
      console.error('Error marking admin notifications read:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const viewer = platformViewerKindFromUser(user);
    await markAllVisiblePlatformAnnouncementsReadForUser(supabase, user.id, viewer);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Admin notifications PATCH:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? (body.description || '').trim() : '';
    const link = typeof body.link === 'string' && body.link.trim() ? body.link.trim() : null;

    const hinted =
      (typeof body.business_id === 'string' ? body.business_id.trim() : '') ||
      request.nextUrl.searchParams.get('business_id')?.trim() ||
      request.headers.get('x-business-id')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const { error } = await supabase.from('admin_notifications').insert({
      business_id: businessId,
      title,
      description,
      link,
      read: false,
    });

    if (error) {
      console.error('Error creating admin notification:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Admin notifications POST:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId, user } = ctx;

    const { searchParams } = new URL(request.url);
    const hinted =
      searchParams.get('business_id')?.trim() ||
      request.headers.get('x-business-id')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { error } = await supabase.from('admin_notifications').delete().eq('business_id', businessId);

    if (error) {
      console.error('Error clearing admin notifications:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const viewer = platformViewerKindFromUser(user);
    await markAllVisiblePlatformAnnouncementsReadForUser(supabase, user.id, viewer);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Admin notifications DELETE:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
