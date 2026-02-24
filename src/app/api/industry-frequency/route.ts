import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Check if a zipcode falls within any of the given location IDs via location_zip_codes.
 * When useWildcard is true, matches zip_code that starts with the given zip (prefix match).
 */
async function isZipcodeInLocations(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  zipcode: string,
  locationIds: string[],
  useWildcard = false
): Promise<boolean> {
  if (!zipcode?.trim() || !locationIds?.length) return false;
  const zip = String(zipcode).trim().replace(/\s/g, '');
  let query = supabase
    .from('location_zip_codes')
    .select('id')
    .eq('active', true)
    .in('location_id', locationIds)
    .limit(1);
  if (useWildcard) {
    query = query.ilike('zip_code', zip + '%');
  } else {
    query = query.eq('zip_code', zip);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Error checking zipcode in locations:', error);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get('industryId');
    const businessId = searchParams.get('businessId');
    const zipcode = searchParams.get('zipcode')?.trim();
    const includeAll = searchParams.get('includeAll') === 'true' || searchParams.get('admin') === 'true';
    const useWildcard = searchParams.get('wildcard') === 'true';

    console.log('=== INDUSTRY FREQUENCY API DEBUG ===');
    console.log('Industry ID:', industryId);
    console.log('Business ID:', businessId);
    console.log('Zipcode filter:', zipcode || '(none)', useWildcard ? '(wildcard)' : '');

    if (!industryId && !businessId) {
      return NextResponse.json(
        { error: 'Industry ID or Business ID is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('industry_frequency')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (industryId) {
      query = query.eq('industry_id', industryId);
    }

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data: frequencies, error } = await query;

    console.log('Frequencies query result:', { frequencies, error });

    if (error) {
      console.error('Error fetching frequencies:', error);
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Industry frequency table not found. Please run the database migration first.' },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Failed to fetch frequencies: ${error.message}` },
        { status: 500 }
      );
    }

    // For customer booking: only show frequencies with display 'Both' or 'Booking' (treat null/undefined as Both)
    const forCustomer = !includeAll;
    let filtered = frequencies ?? [];
    if (forCustomer) {
      filtered = (filtered as any[]).filter(
        (f: any) => !f.display || f.display === 'Both' || f.display === 'Booking'
      );
    }

    // Filter by zipcode when "Should the frequency show based on the location?" = Yes
    // - includeAll/admin: no location filtering
    // - zipcode provided: include non-location-based + location-based where zip in range
    // - no zipcode: only non-location-based
    if (includeAll) {
      // keep as is
    } else if (zipcode) {
      const results: typeof frequencies = [];
      for (const freq of filtered) {
        const showBasedOnLocation = freq.show_based_on_location === true;
        const locationIds = Array.isArray(freq.location_ids) ? freq.location_ids : [];
        if (!showBasedOnLocation) {
          results.push(freq);
        } else {
          const inRange = await isZipcodeInLocations(supabase, zipcode, locationIds, useWildcard);
          if (inRange) results.push(freq);
        }
      }
      filtered = results;
      // If zip filtering left nothing, show non-location-based so customer still sees options
      if (filtered.length === 0) {
        filtered = (frequencies ?? []).filter(
          (f: any) => (!f.display || f.display === 'Both' || f.display === 'Booking') && f.show_based_on_location !== true
        );
      }
    } else {
      filtered = (filtered as any[]).filter(
        (f) => f.show_based_on_location !== true
      );
    }

    console.log('Returning frequencies:', filtered?.length);
    return NextResponse.json({ frequencies: filtered });
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
      different_on_customer_end,
      show_explanation,
      enable_popup,
      display,
      occurrence_time,
      discount,
      discount_type,
      is_default,
      excluded_providers,
      // Recurring frequency options
      frequency_repeats,
      shorter_job_length,
      shorter_job_length_by,
      exclude_first_appointment,
      frequency_discount,
      charge_one_time_price,
      // Dependencies
      add_to_other_industries,
      enabled_industries,
      show_based_on_location,
      location_ids,
      service_categories,
      bathroom_variables,
      sqft_variables,
      bedroom_variables,
      exclude_parameters,
      extras
    } = body;

    if (!business_id || !industry_id || !name || !occurrence_time) {
      return NextResponse.json(
        { error: 'Business ID, Industry ID, Name, and Occurrence Time are required' },
        { status: 400 }
      );
    }

    const { data: frequency, error } = await supabase
      .from('industry_frequency')
      .insert([
        {
          business_id,
          industry_id,
          name: name.trim(),
          description: description?.trim() || null,
          different_on_customer_end: different_on_customer_end || false,
          show_explanation: show_explanation || false,
          enable_popup: enable_popup || false,
          display: display || 'Both',
          occurrence_time,
          discount: discount || 0,
          discount_type: discount_type || '%',
          is_default: is_default || false,
          excluded_providers: excluded_providers || [],
          // Recurring frequency options (stored as JSON or additional columns if needed)
          frequency_repeats: frequency_repeats || null,
          shorter_job_length: shorter_job_length || null,
          shorter_job_length_by: shorter_job_length_by || null,
          exclude_first_appointment: exclude_first_appointment || false,
          frequency_discount: frequency_discount || null,
          charge_one_time_price: charge_one_time_price || false,
          // Dependencies
          add_to_other_industries: add_to_other_industries || false,
          enabled_industries: enabled_industries || [],
          show_based_on_location: show_based_on_location || false,
          location_ids: location_ids || [],
          service_categories: service_categories || [],
          bathroom_variables: bathroom_variables || [],
          sqft_variables: sqft_variables || [],
          bedroom_variables: bedroom_variables || [],
          exclude_parameters: exclude_parameters || [],
          extras: extras || []
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating frequency:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Frequency with this name already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Failed to create frequency: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ frequency }, { status: 201 });
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
        { error: 'Frequency ID is required' },
        { status: 400 }
      );
    }

    const cleanedData: any = {
      updated_at: new Date().toISOString()
    };

    if (updateData.name !== undefined) cleanedData.name = updateData.name.trim();
    if (updateData.description !== undefined) cleanedData.description = updateData.description?.trim() || null;
    if (updateData.different_on_customer_end !== undefined) cleanedData.different_on_customer_end = updateData.different_on_customer_end;
    if (updateData.show_explanation !== undefined) cleanedData.show_explanation = updateData.show_explanation;
    if (updateData.enable_popup !== undefined) cleanedData.enable_popup = updateData.enable_popup;
    if (updateData.display !== undefined) cleanedData.display = updateData.display;
    if (updateData.occurrence_time !== undefined) cleanedData.occurrence_time = updateData.occurrence_time;
    if (updateData.discount !== undefined) cleanedData.discount = updateData.discount;
    if (updateData.discount_type !== undefined) cleanedData.discount_type = updateData.discount_type;
    if (updateData.is_default !== undefined) cleanedData.is_default = updateData.is_default;
    if (updateData.excluded_providers !== undefined) cleanedData.excluded_providers = updateData.excluded_providers;
    // Recurring frequency options
    if (updateData.frequency_repeats !== undefined) cleanedData.frequency_repeats = updateData.frequency_repeats;
    if (updateData.shorter_job_length !== undefined) cleanedData.shorter_job_length = updateData.shorter_job_length;
    if (updateData.shorter_job_length_by !== undefined) cleanedData.shorter_job_length_by = updateData.shorter_job_length_by;
    if (updateData.exclude_first_appointment !== undefined) cleanedData.exclude_first_appointment = updateData.exclude_first_appointment;
    if (updateData.frequency_discount !== undefined) cleanedData.frequency_discount = updateData.frequency_discount;
    if (updateData.charge_one_time_price !== undefined) cleanedData.charge_one_time_price = updateData.charge_one_time_price;
    // Dependencies
    if (updateData.add_to_other_industries !== undefined) cleanedData.add_to_other_industries = updateData.add_to_other_industries;
    if (updateData.enabled_industries !== undefined) cleanedData.enabled_industries = updateData.enabled_industries;
    if (updateData.show_based_on_location !== undefined) cleanedData.show_based_on_location = updateData.show_based_on_location;
    if (updateData.location_ids !== undefined) cleanedData.location_ids = updateData.location_ids;
    if (updateData.service_categories !== undefined) cleanedData.service_categories = updateData.service_categories;
    if (updateData.bathroom_variables !== undefined) cleanedData.bathroom_variables = updateData.bathroom_variables;
    if (updateData.sqft_variables !== undefined) cleanedData.sqft_variables = updateData.sqft_variables;
    if (updateData.bedroom_variables !== undefined) cleanedData.bedroom_variables = updateData.bedroom_variables;
    if (updateData.exclude_parameters !== undefined) cleanedData.exclude_parameters = updateData.exclude_parameters;
    if (updateData.extras !== undefined) cleanedData.extras = updateData.extras;

    const { data: frequency, error } = await supabase
      .from('industry_frequency')
      .update(cleanedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating frequency:', error);
      return NextResponse.json(
        { error: `Failed to update frequency: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ frequency });
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
        { error: 'Frequency ID is required' },
        { status: 400 }
      );
    }

    if (permanent) {
      const { error } = await supabase
        .from('industry_frequency')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error permanently deleting frequency:', error);
        return NextResponse.json(
          { error: `Failed to delete frequency: ${error.message}` },
          { status: 500 }
        );
      }
    } else {
      const { error } = await supabase
        .from('industry_frequency')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Error soft deleting frequency:', error);
        return NextResponse.json(
          { error: `Failed to delete frequency: ${error.message}` },
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
