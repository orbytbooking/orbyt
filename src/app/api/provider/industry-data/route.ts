import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseBookingFormScopeParam, type BookingFormScope } from '@/lib/bookingFormScope';
import { scopedIndustryTable } from '@/lib/formScopeTables';

export async function GET(request: NextRequest) {
  try {
    console.log('=== PROVIDER INDUSTRY DATA API ===');
    
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

    // Get provider data
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('service_providers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (providerError || !provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get('industryId');
    const businessId = searchParams.get('businessId');
    let bookingFormScope: BookingFormScope | null = parseBookingFormScopeParam(
      searchParams.get('bookingFormScope'),
    );

    if (!industryId || !businessId) {
      return NextResponse.json(
        { error: 'Industry ID and Business ID are required' },
        { status: 400 }
      );
    }

    if (!bookingFormScope) {
      const { data: industryRow } = await supabaseAdmin
        .from('industries')
        .select('customer_booking_form_layout')
        .eq('id', industryId)
        .eq('business_id', businessId)
        .maybeSingle();
      const layout = (industryRow as { customer_booking_form_layout?: string } | null)
        ?.customer_booking_form_layout;
      if (layout === 'form2') bookingFormScope = 'form2';
      else if (layout === 'form3') bookingFormScope = 'form3';
      else if (layout === 'form4') bookingFormScope = 'form4';
      else bookingFormScope = 'form1';
    }

    const serviceCategoryTable = scopedIndustryTable('industry_service_category', bookingFormScope);
    const extrasTable = scopedIndustryTable('industry_extras', bookingFormScope);
    const frequencyTable = scopedIndustryTable('industry_frequency', bookingFormScope);

    console.log('Fetching data for industry:', industryId, 'business:', businessId);

    // Fetch service categories
    const { data: categoriesData, error: categoriesError } = await supabaseAdmin
      .from(serviceCategoryTable)
      .select('*')
      .eq('industry_id', industryId)
      .eq('business_id', businessId)
      .eq('booking_form_scope', bookingFormScope);

    console.log('Categories data:', categoriesData);
    console.log('Categories error:', categoriesError);

    // Fetch extras
    const { data: extrasData, error: extrasError } = await supabaseAdmin
      .from(extrasTable)
      .select('*')
      .eq('industry_id', industryId)
      .eq('business_id', businessId)
      .eq('booking_form_scope', bookingFormScope);

    console.log('Extras data:', extrasData);
    console.log('Extras error:', extrasError);

    // Fetch frequencies
    const { data: frequenciesData, error: frequenciesError } = await supabaseAdmin
      .from(frequencyTable)
      .select('*')
      .eq('industry_id', industryId)
      .eq('business_id', businessId)
      .eq('booking_form_scope', bookingFormScope)
      .eq('is_active', true);

    console.log('Frequencies data:', frequenciesData);
    console.log('Frequencies error:', frequenciesError);

    // Fetch locations
    const { data: locationsData, error: locationsError } = await supabaseAdmin
      .from('locations')
      .select('*')
      .eq('business_id', businessId);

    console.log('Locations data:', locationsData);
    console.log('Locations error:', locationsError);

    return NextResponse.json({
      serviceCategories: categoriesData || [],
      extras: extrasData || [],
      frequencies: frequenciesData || [],
      locations: locationsData || [],
      errors: {
        categories: categoriesError?.message,
        extras: extrasError?.message,
        frequencies: frequenciesError?.message,
        locations: locationsError?.message
      }
    });

  } catch (error) {
    console.error('Industry data API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
