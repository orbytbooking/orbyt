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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const role = user.user_metadata?.role || 'owner';
    if (role === 'customer') return createForbiddenResponse('Customers cannot access admin endpoints');

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });

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
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const role = user.user_metadata?.role || 'owner';
    if (role === 'customer') return createForbiddenResponse('Customers cannot access admin endpoints');

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });

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
