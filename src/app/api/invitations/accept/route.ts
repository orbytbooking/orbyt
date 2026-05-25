import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
    if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

    // Create Supabase client with service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const body = await request.json();
    const { invitationId, password, firstName, lastName, email, phone, address, businessId, providerType } = body;

    console.log('=== ACCEPTING INVITATION ===');
    console.log('Invitation ID:', invitationId);

    // Set context settings for RLS policies
    await supabase.rpc('set_config', {
      config_name: 'app.current_invitation_token',
      config_value: invitationId
    });

    // Get invitation data using service role to bypass RLS
    const { data: invitation, error } = await supabase
      .from('provider_invitations')
      .select('id, email, expires_at, business_id, invited_by')
      .eq('id', invitationId)
      .single();

    console.log('Database query result:');
    console.log('- Error:', error);
    console.log('- Invitation data:', invitation);
    console.log('- Invitation found:', !!invitation);
    console.log('- Invitation ID:', invitation?.id);
    console.log('- Invitation email:', invitation?.email);
    console.log('- Invitation expires at:', invitation?.expires_at);
    console.log('- Invitation business ID:', invitation?.business_id);

    if (error) {
      console.error('Invitation fetch error:', error);
      return NextResponse.json(
        { error: 'Invitation not found', details: error },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();
    
    console.log('Expiration check:');
    console.log('- Expires at:', expiresAt);
    console.log('- Current time:', now);
    console.log('- Is expired:', expiresAt < now);
    
    if (expiresAt < now) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    // Get business data using service role to bypass RLS
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', invitation.business_id)
      .single();

    if (businessError) {
      console.error('Business fetch error:', businessError);
      return NextResponse.json(
        { error: 'Business not found', details: businessError },
        { status: 404 }
      );
    }

    console.log('- Business data:', businessData);
    console.log('- Business name:', businessData?.name);

    // Create user directly in database first (bypass Supabase auth)
    console.log('Creating provider record directly...');
    
    // Create provider record first with NULL user_id
    const { data: providerData, error: providerError } = await supabase
      .from('service_providers')
      .insert({
        user_id: null, // Will be updated later if auth user is created
        business_id: businessId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone,
        address: address,
        specialization: 'General Services',
        rating: 0,
        completed_jobs: 0,
        status: 'active',
        provider_type: providerType
      })
      .select('id')
      .single();

    if (providerError) {
      console.error('Provider record creation error:', providerError);
      return NextResponse.json(
        { error: 'Failed to create provider profile', details: providerError.message },
        { status: 500 }
      );
    }

    console.log('Provider record created successfully:', providerData.id);
    const providerId = providerData.id;

    // Create Supabase auth user via Admin API so the user is created in auth.users and can log in immediately
    console.log('Creating Supabase auth user via Admin API...');
    let authUserCreated = false;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `${firstName} ${lastName}`,
        role: 'provider',
        provider_type: providerType,
        invitation_id: invitationId,
        business_id: businessId,
        specialization: 'General Services',
        phone: phone ?? undefined,
        address: address ?? undefined,
        invited_by: invitation?.invited_by ?? undefined,
        accepted_invitation_at: new Date().toISOString()
      }
    });

    if (authError) {
      console.error('Auth user creation failed:', authError);
      // If user already exists (e.g. duplicate email), try to update provider with existing user
      if (authError.message?.toLowerCase().includes('already been registered') || authError.message?.toLowerCase().includes('already exists')) {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers?.users?.find((u: { email?: string }) => u.email?.toLowerCase() === email?.toLowerCase());
        if (existing?.id) {
          await supabase
            .from('service_providers')
            .update({ user_id: existing.id })
            .eq('id', providerId);
          authUserCreated = true;
          console.log('Linked provider to existing auth user:', existing.id);
        }
      }
      if (!authUserCreated) {
        return NextResponse.json(
          { error: authError.message || 'Failed to create login account. Provider profile was created.' },
          { status: 400 }
        );
      }
    } else if (authData?.user?.id) {
      authUserCreated = true;
      console.log('Auth user created successfully:', authData.user.id);
      await supabase
        .from('service_providers')
        .update({ user_id: authData.user.id })
        .eq('id', providerId);
    }

    // Update invitation status using service role to bypass RLS
    const { error: updateError } = await supabase
      .from('provider_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (updateError) {
      console.error('Invitation update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to accept invitation', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('Invitation updated successfully');

    return NextResponse.json({
      success: true,
      message: authUserCreated 
        ? 'Invitation accepted successfully - Provider account and login created'
        : 'Invitation accepted successfully - Provider account created (login setup may be needed)',
      authUserCreated,
      providerCreated: true
    });

  } catch (error: any) {
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
