import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== ENVIRONMENT CHECK ===');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
    console.log('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
    console.log('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY length:', process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.length || 0);
    console.log('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY starts with eyJ:', process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ'));
    console.log('=== END ENVIRONMENT CHECK ===');

    // Create Supabase client with service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

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

    // Create auth user first
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
          // Set user metadata to track invitation acceptance
          user_metadata: {
            invitation_id: invitationId,
            invited_by: invitation?.invited_by || null,
            accepted_invitation_at: new Date().toISOString()
          }
        }
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return NextResponse.json(
        { error: 'Failed to create user account', details: authError.message },
        { status: 500 }
      );
    }

    // Create provider record
    const { error: providerError } = await supabase
      .from('service_providers')
      .insert({
        user_id: authData.user?.id,
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
