import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get('industryId');
    const businessId = searchParams.get('businessId');

    console.log('🔍 SERVICE CATEGORIES API DEBUG');
    console.log('📥 industryId:', industryId);
    console.log('📥 businessId:', businessId);

    if (!industryId && !businessId) {
      return NextResponse.json(
        { error: 'Industry ID or Business ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('industry_service_category')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (industryId) {
      query = query.eq('industry_id', industryId);
      console.log('🎯 Filtering by industry_id:', industryId);
    }

    if (businessId) {
      query = query.eq('business_id', businessId);
      console.log('🏢 Filtering by business_id:', businessId);
    }

    console.log('📊 Executing query...');
    const { data: categories, error } = await query;

    console.log('📦 Query result:');
    console.log('  - error:', error);
    console.log('  - categories:', categories);
    console.log('  - categories length:', categories?.length || 0);

    if (error) {
      console.error('Error fetching service categories:', error);
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Service categories table not found. Please run the database migration first.' },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Failed to fetch service categories: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ serviceCategories: categories });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const body = await request.json();
    const {
      business_id,
      industry_id,
      name,
      description,
      color,
      icon,
      display,
      display_service_length_customer,
      display_service_length_provider,
      can_customer_edit_service,
      service_fee_enabled,
      service_category_frequency,
      selected_frequencies,
      variables,
      exclude_parameters,
      selected_exclude_parameters,
      extras,
      extras_config,
      expedited_charge,
      cancellation_fee,
      hourly_service,
      service_category_price,
      service_category_time,
      minimum_price,
      override_provider_pay,
      excluded_providers,
      sort_order
    } = body;

    if (!business_id || !industry_id || !name) {
      return NextResponse.json(
        { error: 'Business ID, Industry ID, and Name are required' },
        { status: 400 }
      );
    }

    const { data: category, error } = await supabase
      .from('industry_service_category')
      .insert([
        {
          business_id,
          industry_id,
          name: name.trim(),
          description: description?.trim() || null,
          color: color || null,
          icon: icon || null,
          display: display || 'customer_frontend_backend_admin',
          display_service_length_customer: display_service_length_customer || 'admin_only',
          display_service_length_provider: display_service_length_provider || false,
          can_customer_edit_service: can_customer_edit_service || false,
          service_fee_enabled: service_fee_enabled || false,
          service_category_frequency: service_category_frequency || false,
          selected_frequencies: selected_frequencies || [],
          variables: variables || {},
          exclude_parameters: exclude_parameters || {
            pets: false,
            smoking: false,
            deepCleaning: false
          },
          selected_exclude_parameters: selected_exclude_parameters || [],
          extras: extras || [],
          extras_config: extras_config || {
            tip: {
              enabled: false,
              saveTo: 'all',
              display: 'customer_frontend_backend_admin'
            },
            parking: {
              enabled: false,
              saveTo: 'all',
              display: 'customer_frontend_backend_admin'
            }
          },
          expedited_charge: expedited_charge || {
            enabled: false,
            amount: "",
            displayText: "",
            currency: "$"
          },
          cancellation_fee: cancellation_fee || {
            enabled: false,
            type: 'single',
            fee: "",
            currency: "$",
            payProvider: false,
            providerFee: "",
            providerCurrency: "$",
            chargeTiming: 'beforeDay',
            beforeDayTime: "",
            hoursBefore: ""
          },
          hourly_service: hourly_service || {
            enabled: false,
            price: "",
            currency: "$",
            priceCalculationType: 'customTime',
            countExtrasSeparately: false
          },
          service_category_price: service_category_price || {
            enabled: false,
            price: "",
            currency: "$"
          },
          service_category_time: service_category_time || {
            enabled: false,
            hours: "0",
            minutes: "0"
          },
          minimum_price: minimum_price || {
            enabled: false,
            checkAmountType: 'discounted',
            price: "",
            checkRecurringSchedule: false,
            textToDisplay: false,
            noticeText: ""
          },
          override_provider_pay: override_provider_pay || {
            enabled: false,
            amount: "",
            currency: "$"
          },
          excluded_providers: excluded_providers || [],
          sort_order: sort_order || 0,
          is_active: true
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating service category:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Service category with this name already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Failed to create service category: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ serviceCategory: category }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Service category ID is required' },
        { status: 400 }
      );
    }

    const cleanedData: any = {
      updated_at: new Date().toISOString()
    };

    // Clean and validate each field
    if (updateData.name !== undefined) cleanedData.name = updateData.name.trim();
    if (updateData.description !== undefined) cleanedData.description = updateData.description?.trim() || null;
    if (updateData.color !== undefined) cleanedData.color = updateData.color;
    if (updateData.icon !== undefined) cleanedData.icon = updateData.icon;
    if (updateData.display !== undefined) cleanedData.display = updateData.display;
    if (updateData.display_service_length_customer !== undefined) cleanedData.display_service_length_customer = updateData.display_service_length_customer;
    if (updateData.display_service_length_provider !== undefined) cleanedData.display_service_length_provider = updateData.display_service_length_provider;
    if (updateData.can_customer_edit_service !== undefined) cleanedData.can_customer_edit_service = updateData.can_customer_edit_service;
    if (updateData.service_fee_enabled !== undefined) cleanedData.service_fee_enabled = updateData.service_fee_enabled;
    if (updateData.service_category_frequency !== undefined) cleanedData.service_category_frequency = updateData.service_category_frequency;
    if (updateData.selected_frequencies !== undefined) cleanedData.selected_frequencies = updateData.selected_frequencies;
    if (updateData.variables !== undefined) cleanedData.variables = updateData.variables;
    if (updateData.exclude_parameters !== undefined) cleanedData.exclude_parameters = updateData.exclude_parameters;
    if (updateData.selected_exclude_parameters !== undefined) cleanedData.selected_exclude_parameters = updateData.selected_exclude_parameters;
    if (updateData.extras !== undefined) cleanedData.extras = updateData.extras;
    if (updateData.extras_config !== undefined) cleanedData.extras_config = updateData.extras_config;
    if (updateData.expedited_charge !== undefined) cleanedData.expedited_charge = updateData.expedited_charge;
    if (updateData.cancellation_fee !== undefined) cleanedData.cancellation_fee = updateData.cancellation_fee;
    if (updateData.hourly_service !== undefined) cleanedData.hourly_service = updateData.hourly_service;
    if (updateData.service_category_price !== undefined) cleanedData.service_category_price = updateData.service_category_price;
    if (updateData.service_category_time !== undefined) cleanedData.service_category_time = updateData.service_category_time;
    if (updateData.minimum_price !== undefined) cleanedData.minimum_price = updateData.minimum_price;
    if (updateData.override_provider_pay !== undefined) cleanedData.override_provider_pay = updateData.override_provider_pay;
    if (updateData.excluded_providers !== undefined) cleanedData.excluded_providers = updateData.excluded_providers;
    if (updateData.sort_order !== undefined) cleanedData.sort_order = updateData.sort_order;

    const { data: category, error } = await supabase
      .from('industry_service_category')
      .update(cleanedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service category:', error);
      return NextResponse.json(
        { error: `Failed to update service category: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ serviceCategory: category });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';

    if (!id) {
      return NextResponse.json(
        { error: 'Service category ID is required' },
        { status: 400 }
      );
    }

    if (permanent) {
      const { error } = await supabase
        .from('industry_service_category')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error permanently deleting service category:', error);
        return NextResponse.json(
          { error: `Failed to delete service category: ${error.message}` },
          { status: 500 }
        );
      }
    } else {
      const { error } = await supabase
        .from('industry_service_category')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Error soft deleting service category:', error);
        return NextResponse.json(
          { error: `Failed to delete service category: ${error.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
