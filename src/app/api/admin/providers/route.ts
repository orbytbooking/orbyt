import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Debug environment variables
console.log('=== API ROUTE ENV DEBUG ===');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
console.log('Service role key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
}

if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      type,
      sendEmailNotification,
      businessId
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !address || !businessId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create admin client
    console.log('Creating admin client with service role key...');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('Admin client created successfully');

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password: tempPassword,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          phone,
          address,
          role: 'provider',
          provider_type: type,
          created_by_admin: true,
          temp_password: tempPassword,
          send_email_notification: sendEmailNotification ? 'true' : 'false'
        }
      }
    });

    if (authError || !authData.user) {
      console.error('Auth creation error:', authError);
      
      // Handle duplicate user error specifically
      if (authError?.message?.includes('already registered') || authError?.message?.includes('duplicate')) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: authError?.message || 'Failed to create provider account' },
        { status: 500 }
      );
    }

    // Create provider record using direct insert
    const { data: providerData, error: providerError } = await supabaseAdmin
      .from('service_providers')
      .insert({
        user_id: authData.user.id,
        business_id: businessId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        address,
        specialization: "General Services",
        rating: 0,
        completed_jobs: 0,
        status: "active",
        provider_type: type,
        send_email_notification: sendEmailNotification
      })
      .select()
      .single();

    if (providerError) {
      console.error('Database insert error:', providerError);
      return NextResponse.json(
        { error: providerError.message || 'Failed to save provider data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      provider: providerData,
      tempPassword,
      message: 'Provider created successfully'
    });

  } catch (error) {
    console.error('Provider creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
