import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Temporarily hardcode service role key to bypass environment variable issue
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aezwtsnvttquqkzjhoak.supabase.co';
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlend0c252dHRxdXFrempob2FrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYxNzcwMiwiZXhwIjoyMDgzMTkzNzAyfQ.MW8hx4BcMKDG3-fxNcIrmcbdu2xIfYjIxIunqPmN3D0';

    console.log('=== ENVIRONMENT DEBUG ===');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Service key length:', supabaseServiceKey.length);
    console.log('Service key starts with eyJ:', supabaseServiceKey.startsWith('eyJ'));

    // Create Supabase client with service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await request.json();
    const { invitationId, password, firstName, lastName, email, phone, address, businessId, providerType } = body;

    console.log('=== ACCEPTING INVITATION ===');
    console.log('Invitation ID:', invitationId);

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

    // Create auth user using regular signUp with bypass
    console.log('Creating auth user...');
    let finalAuthData: any;
    
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
        console.error('Auth creation error:', authError);
        
        // If it's a duplicate user error, try to get existing user
        if (authError.message.includes('already registered')) {
          console.log('User already exists, trying to get existing user...');
          const { data: existingUser } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (existingUser.user) {
            console.log('Using existing user:', existingUser.user.id);
            finalAuthData = existingUser;
          } else {
            return NextResponse.json(
              { error: 'User already exists but sign in failed', details: authError.message },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'Failed to create user account', details: authError.message },
            { status: 500 }
          );
        }
      } else {
        finalAuthData = authData;
      }

      if (!finalAuthData.user) {
        return NextResponse.json(
          { error: 'Failed to create user account - no user data returned' },
          { status: 500 }
        );
      }

      console.log('Auth user created/retrieved successfully:', finalAuthData.user.id);

    } catch (signUpError: any) {
      console.error('Unexpected error during user creation:', signUpError);
      return NextResponse.json(
        { error: 'Unexpected error during user creation', details: signUpError.message },
        { status: 500 }
      );
    }

    // Create provider record
    const { error: providerError } = await supabase
      .from('service_providers')
      .insert({
        user_id: finalAuthData.user?.id,
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
      });

    if (providerError) {
      console.error('Provider record creation error:', providerError);
      return NextResponse.json(
        { error: 'Failed to create provider profile', details: providerError.message },
        { status: 500 }
      );
    }

    console.log('Provider record created successfully');

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
      message: 'Invitation accepted successfully'
    });

  } catch (error: any) {
    console.error('Accept invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
