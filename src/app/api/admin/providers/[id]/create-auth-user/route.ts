import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase env vars');
}

/**
 * Create an auth user for a provider that has user_id = null.
 * Admin sets a temporary password; provider can log in and change it.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: providerId } = await params;
    const body = await request.json();
    const { password } = body;

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password is required and must be at least 8 characters' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: provider, error: fetchError } = await supabase
      .from('service_providers')
      .select('id, user_id, first_name, last_name, email, phone, address, business_id, provider_type')
      .eq('id', providerId)
      .single();

    if (fetchError || !provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    if (provider.user_id) {
      return NextResponse.json(
        { error: 'Provider already has a login account (user_id is set)' },
        { status: 400 }
      );
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: provider.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `${provider.first_name} ${provider.last_name}`,
        role: 'provider',
        provider_type: provider.provider_type ?? 'individual',
        business_id: provider.business_id,
        phone: provider.phone ?? undefined,
        address: provider.address ?? undefined
      }
    });

    if (authError) {
      const msg = authError.message || 'Failed to create auth user';
      if (msg.toLowerCase().includes('already been registered') || msg.toLowerCase().includes('already exists')) {
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existing = listData?.users?.find(
          (u: { email?: string }) => u.email?.toLowerCase() === provider.email?.toLowerCase()
        );
        if (existing?.id) {
          const { error: updateError } = await supabase
            .from('service_providers')
            .update({ user_id: existing.id, updated_at: new Date().toISOString() })
            .eq('id', providerId);
          if (!updateError) {
            return NextResponse.json({
              success: true,
              message: 'Provider linked to existing auth account',
              userId: existing.id
            });
          }
        }
      }
      return NextResponse.json(
        { error: msg },
        { status: 400 }
      );
    }

    if (!authData?.user?.id) {
      return NextResponse.json(
        { error: 'Auth user was not created' },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from('service_providers')
      .update({
        user_id: authData.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', providerId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to link provider to auth user: ' + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Login account created. Provider can sign in with this email and the password you set.',
      userId: authData.user.id
    });
  } catch (error: unknown) {
    console.error('Create auth user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
