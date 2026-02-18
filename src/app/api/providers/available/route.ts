import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== GET AVAILABLE PROVIDERS API (CUSTOMER FACING) ===');
    
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const serviceId = searchParams.get('serviceId');
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    if (!serviceId) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    if (!time) {
      return NextResponse.json(
        { error: 'Time is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`Fetching providers for business: ${businessId}, service: ${serviceId}, date: ${date}, time: ${time}`);

    // Get available providers for this business
    let query = supabaseAdmin
      .from('service_providers')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'active')
      .eq('availability_status', 'available');

    const { data: providers, error } = await query;

    if (error) {
      console.error('Error fetching available providers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch providers', details: error.message },
        { status: 500 }
      );
    }

    console.log(`Found ${providers?.length || 0} providers before filtering`);

    // Filter and score providers based on basic availability
    const availableProviders = providers?.map(provider => {
      let isAvailable = true;
      let availabilityScore = 100;
      const reasons = [];

      // Basic availability check
      if (provider.status !== 'active' || provider.availability_status !== 'available') {
        isAvailable = false;
        reasons.push('Provider not available');
      } else {
        availabilityScore += 20;
        reasons.push('Provider is active and available');
      }

      return {
        id: provider.id,
        name: `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || 'Provider',
        email: provider.email,
        phone: provider.phone,
        specialization: provider.specialization || 'General Service Provider',
        rating: provider.rating || 0,
        completedJobs: provider.completed_jobs || 0,
        isAvailable,
        availabilityScore,
        reasons,
        services: [], // Empty for now, can be enhanced later
        payRates: [],
        capacity: null,
        preferences: null
      };
    }) || [];

    // Sort by availability score (highest first)
    availableProviders.sort((a, b) => b.availabilityScore - a.availabilityScore);

    console.log(`Returning ${availableProviders.length} available providers`);

    return NextResponse.json({
      success: true,
      providers: availableProviders,
      count: availableProviders.length
    });

  } catch (error: any) {
    console.error('Available providers API error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: 'Failed to fetch available providers'
      },
      { status: 500 }
    );
  }
}
