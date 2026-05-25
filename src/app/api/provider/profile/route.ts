import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('=== PROVIDER PROFILE API ===');
    
    // Create service role client for server-side operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user session with token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get provider data with business info
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('service_providers')
      .select(`
        *,
        businesses(name)
      `)
      .eq('user_id', user.id)
      .single();

    if (providerError || !provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Get provider's reviews from database (filtered by business)
    const { data: reviews, error: reviewsError } = await supabaseAdmin
      .from('provider_reviews')
      .select(`
        *,
        customers(name)
      `)
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id) // CRITICAL: Filter by business ID
      .order('created_at', { ascending: false })
      .limit(10);

    // Transform reviews data
    const transformedReviews = reviews?.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.review_text || '',
      date: review.created_at?.split('T')[0] || '',
      service: 'Service', // We could join with bookings table to get service name
      customerName: review.customers?.name || 'Anonymous'
    })) || [];

    // Transform provider data
    const profileData = {
      id: provider.id,
      firstName: provider.first_name,
      lastName: provider.last_name,
      email: provider.email,
      phone: provider.phone,
      address: provider.address,
      specialization: provider.specialization,
      rating: provider.rating || 4.8,
      completedJobs: provider.completed_jobs || 28,
      businessName: provider.businesses?.name || 'Business',
      memberSince: provider.created_at,
      status: provider.status,
      providerType: provider.provider_type,
      profileImageUrl: provider.profile_image_url,
      stripeAccountId: provider.stripe_account_id,
      stripeAccountEmail: provider.stripe_account_email,
      stripeIsConnected: provider.stripe_is_connected || false,
      stripeConnectEnabled: provider.stripe_connect_enabled || false,
      reviews: transformedReviews
    };

    return NextResponse.json(profileData);

  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('=== UPDATE PROVIDER PROFILE API ===');
    
    // Create service role client for server-side operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user session with token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const { 
      firstName, 
      lastName, 
      phone, 
      address, 
      specialization,
      profileImageUrl,
      stripeAccountId,
      stripeAccountEmail,
      stripeIsConnected,
      stripeConnectEnabled
    } = await request.json();

    // Update provider profile
    const { data: updatedProvider, error: updateError } = await supabaseAdmin
      .from('service_providers')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone,
        address,
        specialization,
        profile_image_url: profileImageUrl,
        stripe_account_id: stripeAccountId,
        stripe_account_email: stripeAccountEmail,
        stripe_is_connected: stripeIsConnected,
        stripe_connect_enabled: stripeConnectEnabled,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedProvider);

  } catch (error) {
    console.error('Update profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
