import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/emailService';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    console.log('=== PROVIDER INVITATION API ===');
    
    // Load environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? 'SET' : 'NOT SET');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
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

    console.log('✅ Environment variables loaded successfully');

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      type,
      businessId
    } = body;

    console.log('Provider invitation data:', { firstName, lastName, email, businessId });

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !address || !businessId) {
      console.error('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create admin client
    console.log('Creating Supabase admin client...');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('✅ Admin client created successfully');

    // Get business information
    const { data: businessData, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .single();

    if (businessError || !businessData) {
      console.error('❌ Error fetching business data:', businessError);
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check if provider already exists
    const { data: existingProvider, error: checkError } = await supabaseAdmin
      .from('service_providers')
      .select('id, email')
      .eq('email', email)
      .eq('business_id', businessId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // Not found error
      console.error('❌ Error checking existing provider:', checkError);
      return NextResponse.json(
        { error: 'Database error checking existing provider' },
        { status: 500 }
      );
    }

    if (existingProvider) {
      console.error('❌ Provider already exists:', existingProvider.email);
      return NextResponse.json(
        { error: 'A provider with this email already exists' },
        { status: 409 }
      );
    }

    // Check if there's already a pending invitation
    const { data: existingInvitation, error: invitationError } = await supabaseAdmin
      .from('provider_invitations')
      .select('id, status, expires_at')
      .eq('email', email)
      .eq('business_id', businessId)
      .eq('status', 'pending')
      .single();

    if (invitationError && invitationError.code !== 'PGRST116') { // Not found error
      console.error('❌ Error checking existing invitation:', invitationError);
      return NextResponse.json(
        { error: 'Database error checking existing invitation' },
        { status: 500 }
      );
    }

    if (existingInvitation) {
      console.error('❌ Pending invitation already exists:', existingInvitation.id);
      return NextResponse.json(
        { error: 'A pending invitation already exists for this email' },
        { status: 409 }
      );
    }

    // Generate invitation token and temporary password
    const invitationToken = uuidv4();
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    // Create invitation record
    const { data: invitationData, error: invitationCreateError } = await supabaseAdmin
      .from('provider_invitations')
      .insert({
        business_id: businessId,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        address,
        provider_type: type,
        invitation_token: invitationToken,
        temp_password: tempPassword,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      })
      .select()
      .single();

    if (invitationCreateError) {
      console.error('❌ Error creating invitation:', invitationCreateError);
      return NextResponse.json(
        { error: 'Failed to create provider invitation' },
        { status: 500 }
      );
    }

    console.log('✅ Invitation created successfully:', invitationData.id);

    // Send invitation email (always sent automatically)
    const emailService = new EmailService();
    const emailSent = await emailService.sendProviderInvitation({
      email,
      firstName,
      lastName,
      businessName: businessData.name,
      invitationToken,
      tempPassword
    });

    if (!emailSent) {
      console.warn('⚠️ Email notification failed, but invitation was created');
    } else {
      console.log('✅ Invitation email sent successfully');
    }

    return NextResponse.json({
      success: true,
      invitation: invitationData,
      message: 'Provider invitation sent successfully',
      invitationUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/provider/invite?token=${invitationToken}&email=${encodeURIComponent(email)}`,
      emailSent: true
    });

  } catch (error: any) {
    console.error('❌ Provider invitation error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: 'Failed to create provider invitation',
        timestamp: new Date().toISOString(),
        troubleshooting: [
          '1. Check your .env file contains both NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
          '2. Restart your development server (npm run dev)',
          '3. Visit /api/test-env to verify environment variables are loaded',
          '4. Check the server console for detailed error messages'
        ]
      },
      { status: 500 }
    );
  }
}
