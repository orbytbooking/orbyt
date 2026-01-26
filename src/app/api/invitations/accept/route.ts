import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Load environment variables properly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('=== ENVIRONMENT DEBUG ===');
    console.log('Supabase URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.log('Service key available:', !!supabaseServiceKey);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase configuration');
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'Missing Supabase configuration',
          troubleshooting: [
            '1. Check your .env file contains both NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
            '2. Restart your development server (npm run dev)',
            '3. Visit /api/test-env to verify environment variables are loaded'
          ]
        },
        { status: 500 }
      );
    }

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

    // Create Supabase auth user first - this is critical for login
    console.log('Creating Supabase auth user...');
    let authUserId: string | null = null;
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`,
            role: 'provider',
            provider_type: providerType,
            invitation_id: invitationId,
            business_id: businessId,
            specialization: 'General Services',
            phone: phone,
            address: address,
            invited_by: invitation?.invited_by || null,
            accepted_invitation_at: new Date().toISOString()
          }
        }
      });

      if (authError) {
        console.error('❌ Auth creation failed:', authError);
        return NextResponse.json(
          { 
            error: 'Failed to create auth user', 
            details: authError.message,
            troubleshooting: [
              '1. Check if the email is already registered in Supabase auth',
              '2. Verify the Supabase service role key has proper permissions',
              '3. Check if the password meets requirements'
            ]
          },
          { status: 500 }
        );
      }

      if (!authData.user?.id) {
        console.error('❌ Auth user created but no ID returned');
        return NextResponse.json(
          { 
            error: 'Auth user creation failed - no user ID returned',
            details: 'The auth user was created but we could not retrieve the user ID'
          },
          { status: 500 }
        );
      }

      authUserId = authData.user.id;
      console.log('✅ Auth user created successfully:', authUserId);
      
    } catch (authError: any) {
      console.error('❌ Auth creation exception:', authError);
      return NextResponse.json(
        { 
          error: 'Auth user creation failed', 
          details: authError.message || 'Unknown error during auth user creation'
        },
        { status: 500 }
      );
    }

    // Now create provider record with the actual auth user ID
    console.log('Creating provider record...');
    
    const { data: providerData, error: providerError } = await supabase
      .from('service_providers')
      .insert({
        user_id: authUserId, // Use the actual auth user ID
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
      console.error('❌ Provider record creation error:', providerError);
      
      // Try to clean up the auth user since provider creation failed
      if (authUserId) {
        try {
          await supabase.auth.admin.deleteUser(authUserId);
          console.log('🧹 Cleaned up auth user due to provider creation failure');
        } catch (cleanupError) {
          console.error('Failed to clean up auth user:', cleanupError);
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to create provider profile', details: providerError.message },
        { status: 500 }
      );
    }

    console.log('✅ Provider record created successfully:', providerData.id);
    const providerId = providerData.id;

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
      message: 'Invitation accepted successfully - Provider account and login created',
      authUserCreated: true,
      providerCreated: true,
      authUserId: authUserId,
      providerId: providerId
    });

  } catch (error: any) {
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
