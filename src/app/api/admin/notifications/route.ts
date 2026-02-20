import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';

async function getBusinessId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: business, error } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();
  if (error || !business) return null;
  return business.id;
}

async function validateBusinessAccess(supabase: ReturnType<typeof createClient>, userId: string, businessId: string) {
  const { data: business, error } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('owner_id', userId)
    .maybeSingle();
  return !error && !!business;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const role = user.user_metadata?.role || 'owner';
    if (role === 'customer') return createForbiddenResponse('Customers cannot access admin endpoints');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const businessIdParam = searchParams.get('business_id');
    let businessId: string | null;

    if (businessIdParam) {
      const hasAccess = await validateBusinessAccess(supabase, user.id, businessIdParam);
      if (!hasAccess) return NextResponse.json({ error: 'Business not found or access denied' }, { status: 404 });
      businessId = businessIdParam;
    } else {
      businessId = await getBusinessId(supabase, user.id);
    }
    if (!businessId) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { data: notifications, error } = await supabase
      .from('admin_notifications')
      .select('id, title, description, read, created_at, link')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin notifications:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      notifications: (notifications || []).map((n) => ({
        id: n.id,
        title: n.title,
        description: n.description ?? '',
        read: !!n.read,
        created_at: n.created_at,
        link: typeof (n as { link?: string }).link === 'string' ? (n as { link: string }).link : null,
      })),
    });
  } catch (err) {
    console.error('Admin notifications GET:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const role = user.user_metadata?.role || 'owner';
    if (role === 'customer') return createForbiddenResponse('Customers cannot access admin endpoints');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const businessIdParam = searchParams.get('business_id');
    let businessId: string | null;
    if (businessIdParam) {
      const hasAccess = await validateBusinessAccess(supabase, user.id, businessIdParam);
      if (!hasAccess) return NextResponse.json({ error: 'Business not found or access denied' }, { status: 404 });
      businessId = businessIdParam;
    } else {
      businessId = await getBusinessId(supabase, user.id);
    }
    if (!businessId) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { error } = await supabase
      .from('admin_notifications')
      .update({ read: true })
      .eq('business_id', businessId);

    if (error) {
      console.error('Error marking admin notifications read:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Admin notifications PATCH:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const role = user.user_metadata?.role || 'owner';
    if (role === 'customer') return createForbiddenResponse('Customers cannot access admin endpoints');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? (body.description || '').trim() : '';
    const link = typeof body.link === 'string' && body.link.trim() ? body.link.trim() : null;
    const businessIdParam = body.business_id ?? request.nextUrl.searchParams.get('business_id');

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    let businessId: string | null;
    if (businessIdParam) {
      const hasAccess = await validateBusinessAccess(supabase, user.id, businessIdParam);
      if (!hasAccess) return NextResponse.json({ error: 'Business not found or access denied' }, { status: 404 });
      businessId = businessIdParam;
    } else {
      businessId = await getBusinessId(supabase, user.id);
    }
    if (!businessId) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { error } = await supabase
      .from('admin_notifications')
      .insert({
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
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const role = user.user_metadata?.role || 'owner';
    if (role === 'customer') return createForbiddenResponse('Customers cannot access admin endpoints');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const businessIdParam = searchParams.get('business_id');
    let businessId: string | null;
    if (businessIdParam) {
      const hasAccess = await validateBusinessAccess(supabase, user.id, businessIdParam);
      if (!hasAccess) return NextResponse.json({ error: 'Business not found or access denied' }, { status: 404 });
      businessId = businessIdParam;
    } else {
      businessId = await getBusinessId(supabase, user.id);
    }
    if (!businessId) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { error } = await supabase
      .from('admin_notifications')
      .delete()
      .eq('business_id', businessId);

    if (error) {
      console.error('Error clearing admin notifications:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Admin notifications DELETE:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
