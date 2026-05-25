import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';
import {
  markPlatformAnnouncementReadForUser,
  parsePlatformNotificationId,
} from '@/lib/platform-announcement-notifications';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, user, businessId } = ctx;

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });

    const platformAnnId = parsePlatformNotificationId(id);
    if (platformAnnId) {
      await markPlatformAnnouncementReadForUser(supabase, user.id, platformAnnId);
      return NextResponse.json({ ok: true });
    }

    const { searchParams } = new URL(request.url);
    const hinted =
      searchParams.get('business_id')?.trim() ||
      request.headers.get('x-business-id')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { data: existing, error: fetchError } = await supabase
      .from('admin_notifications')
      .select('id')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('admin_notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('business_id', businessId);

    if (updateError) {
      console.error('Error marking notification read:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Admin notification PATCH:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, user, businessId } = ctx;

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });

    const platformAnnId = parsePlatformNotificationId(id);
    if (platformAnnId) {
      await markPlatformAnnouncementReadForUser(supabase, user.id, platformAnnId);
      return NextResponse.json({ ok: true });
    }

    const { searchParams } = new URL(request.url);
    const hinted =
      searchParams.get('business_id')?.trim() ||
      request.headers.get('x-business-id')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { data: existing, error: fetchError } = await supabase
      .from('admin_notifications')
      .select('id')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('admin_notifications')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);

    if (deleteError) {
      console.error('Error deleting admin notification:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Admin notification DELETE:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
