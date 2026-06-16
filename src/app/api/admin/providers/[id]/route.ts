import { NextRequest, NextResponse } from 'next/server';
import { requireAdminTenantContext } from '@/lib/adminTenantContext';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase: supabaseAdmin, businessId } = ctx;

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    const { data: provider, error } = await supabaseAdmin
      .from('service_providers')
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        email,
        phone,
        address,
        specialization,
        rating,
        completed_jobs,
        status,
        provider_type,
        send_email_notification,
        created_at,
        updated_at,
        tags,
        access_blocked,
        profile_image_url,
        admin_settings,
        performance_score,
        stripe_account_id,
        stripe_is_connected,
        stripe_connect_enabled
      `)
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error) {
      console.error('Error fetching provider:', error);
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      provider
    });

  } catch (error) {
    console.error('Provider fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase: supabaseAdmin, businessId } = ctx;

    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    // Handle password update separately
    if (body.password) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        body.user_id,
        { password: body.password }
      );

      if (authError) {
        console.error('Error updating password:', authError);
        return NextResponse.json(
          { error: 'Failed to update password' },
          { status: 500 }
        );
      }

      const { password, ...providerData } = body;
      if (providerData.performance_score !== undefined) {
        const v = Number(providerData.performance_score);
        (providerData as Record<string, unknown>).performance_score = Number.isNaN(v) ? 0 : Math.max(0, Math.min(100, v));
      }
      const { data: provider, error } = await supabaseAdmin
        .from('service_providers')
        .update({
          ...providerData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        console.error('Error updating provider:', error);
        return NextResponse.json(
          { error: 'Failed to update provider' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        provider,
        message: 'Provider and password updated successfully'
      });
    } else {
      const updateData: Record<string, unknown> = {
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        specialization: body.specialization,
        status: body.status,
        provider_type: body.provider_type,
        send_email_notification: body.send_email_notification,
        updated_at: new Date().toISOString()
      };
      if (body.tags !== undefined) updateData.tags = body.tags;
      if (body.access_blocked !== undefined) updateData.access_blocked = body.access_blocked;
      if (body.admin_settings !== undefined) updateData.admin_settings = body.admin_settings;
      if (body.stripe_connect_enabled !== undefined) updateData.stripe_connect_enabled = body.stripe_connect_enabled;
      if (body.performance_score !== undefined) {
        const v = Number(body.performance_score);
        updateData.performance_score = Number.isNaN(v) ? 0 : Math.max(0, Math.min(100, v));
      }

      const { data: provider, error } = await supabaseAdmin
        .from('service_providers')
        .update(updateData)
        .eq('id', id)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) {
        console.error('Error updating provider:', error);
        return NextResponse.json(
          { error: 'Failed to update provider' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        provider,
        message: 'Provider updated successfully'
      });
    }
  } catch (error) {
    console.error('Provider update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
