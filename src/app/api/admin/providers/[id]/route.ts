import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
}

if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Fetch provider by ID
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
        stripe_account_id,
        stripe_is_connected,
        stripe_connect_enabled
      `)
      .eq('id', id)
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
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Handle password update separately
    if (body.password) {
      // Update password in auth.users
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

      // Remove password from body before updating provider record
      const { password, ...providerData } = body;
      
      // Update provider record (without password)
      const { data: provider, error } = await supabaseAdmin
        .from('service_providers')
        .update({
          ...providerData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
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
      // Regular provider update (no password change)
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

      const { data: provider, error } = await supabaseAdmin
        .from('service_providers')
        .update(updateData)
        .eq('id', id)
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
