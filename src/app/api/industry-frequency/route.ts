import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { normalizeFrequencyPopupDisplay } from '@/lib/frequencyPopupDisplay';
import { parseBookingFormScopeParam, type BookingFormScope } from '@/lib/bookingFormScope';
import { scopedIndustryTable } from '@/lib/formScopeTables';
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';
import { userCanManageBookingsForBusiness } from '@/lib/bookingApiAuth';
import { requireIndustryBelongsToBusiness } from '@/lib/industryTenantGuard';
function normalizeScope(raw: unknown): BookingFormScope {
  const parsed = parseBookingFormScopeParam(
    typeof raw === 'string' ? raw : raw == null ? null : String(raw),
  );
  return parsed ?? 'form1';
}


function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  return createClient(supabaseUrl, supabaseServiceKey);
}

type FrequencyLookup = {
  table: string;
  id: string;
  business_id: string;
  industry_id: string;
  booking_form_scope?: string | null;
};

async function findFrequencyById(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  id: string,
): Promise<FrequencyLookup | null> {
  const tables = [
    'industry_frequency',
    'industry_form2_frequencies',
    'industry_form3_frequencies',
    'industry_form4_frequencies',
    'industry_form5_frequencies',
  ];
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('id, business_id, industry_id, booking_form_scope')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      if (error.code === '42P01') continue;
      continue;
    }
    if (data?.id && data.business_id && data.industry_id) {
      return {
        table,
        id: String(data.id),
        business_id: String(data.business_id),
        industry_id: String(data.industry_id),
        booking_form_scope:
          data.booking_form_scope == null ? null : String(data.booking_form_scope),
      };
    }
  }
  return null;
}

async function clearOtherIndustryFrequencyDefaults(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  businessId: string,
  industryId: string,
  exceptId: string,
  bookingFormScope: BookingFormScope,
) {
  const table = scopedIndustryTable('industry_frequency', bookingFormScope);
  const { error } = await supabase
    .from(table)
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq('business_id', businessId)
    .eq('industry_id', industryId)
    .eq('booking_form_scope', bookingFormScope)
    .neq('id', exceptId);
  if (error) {
    console.error('Error clearing other frequency defaults:', error);
  }
}

/**
 * Check if a zipcode falls within any of the given location IDs via location_zip_codes.
 * When useWildcard is true, matches zip_code that starts with the given zip (prefix match).
 * When businessId is set, only location IDs that belong to that business are considered
 * (prevents stale or cross-tenant IDs from matching).
 */
async function isZipcodeInLocations(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  zipcode: string,
  locationIds: string[],
  useWildcard = false,
  businessId?: string | null
): Promise<boolean> {
  if (!zipcode?.trim() || !locationIds?.length) return false;
  const zip = String(zipcode).trim().replace(/\s/g, '');
  const uniqueIds = [
    ...new Set(
      locationIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0),
    ),
  ];
  if (!uniqueIds.length) return false;

  let scopedIds = uniqueIds;
  if (businessId?.trim()) {
    const { data: locRows, error: locErr } = await supabase
      .from('locations')
      .select('id')
      .eq('business_id', businessId.trim())
      .in('id', uniqueIds);
    if (locErr) {
      console.error('Error resolving locations for zip filter:', locErr);
      return false;
    }
    scopedIds = (locRows || [])
      .map((r: { id?: string }) => r.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    if (!scopedIds.length) return false;
  }

  let query = supabase
    .from('location_zip_codes')
    .select('id')
    .eq('active', true)
    .in('location_id', scopedIds)
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
    const bookingFormScope = parseBookingFormScopeParam(searchParams.get('bookingFormScope'));
    const frequencyTable = scopedIndustryTable('industry_frequency', bookingFormScope);

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

    const forCustomer = !includeAll;
    if (forCustomer && !businessId?.trim()) {
      return NextResponse.json(
        {
          error:
            'businessId is required for customer booking frequency requests (scopes rows and location zip matching).',
        },
        { status: 400 },
      );
    }

    let query = supabase
      .from(frequencyTable)
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (industryId) {
      query = query.eq('industry_id', industryId);
    }

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    if (bookingFormScope) {
      query = query.eq('booking_form_scope', bookingFormScope);
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
          const inRange = await isZipcodeInLocations(
            supabase,
            zipcode,
            locationIds,
            useWildcard,
            (freq as { business_id?: string }).business_id,
          );
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
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const body = await request.json();
    const {
      business_id,
      industry_id,
      name,
      description,
      different_on_customer_end,
      show_explanation,
      enable_popup,
      explanation_tooltip_text,
      popup_content,
      popup_display,
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
      extras,
      booking_form_scope: booking_form_scope_raw,
    } = body;

    const booking_form_scope = normalizeScope(booking_form_scope_raw);
    const frequencyTable = scopedIndustryTable('industry_frequency', booking_form_scope);

    if (!business_id || !industry_id || !name || !occurrence_time) {
      return NextResponse.json(
        { error: 'Business ID, Industry ID, Name, and Occurrence Time are required' },
        { status: 400 }
      );
    }
    const allowed = await userCanManageBookingsForBusiness(supabase, user.id, String(business_id));
    if (!allowed) {
      return createForbiddenResponse('You do not have access to this business');
    }
    const tenant = await requireIndustryBelongsToBusiness(supabase, String(business_id), String(industry_id));
    if (!tenant.ok) {
      return NextResponse.json({ error: 'Industry not found for this business' }, { status: 404 });
    }

    const { data: frequency, error } = await supabase
      .from(frequencyTable)
      .insert([
        {
          business_id,
          industry_id,
          name: name.trim(),
          description: description?.trim() || null,
          different_on_customer_end: different_on_customer_end || false,
          show_explanation: show_explanation || false,
          enable_popup: enable_popup || false,
          explanation_tooltip_text: explanation_tooltip_text?.trim() || null,
          popup_content: popup_content?.trim() || null,
          popup_display: normalizeFrequencyPopupDisplay(popup_display),
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
          location_ids: show_based_on_location ? location_ids || [] : [],
          service_categories: service_categories || [],
          bathroom_variables: bathroom_variables || [],
          sqft_variables: sqft_variables || [],
          bedroom_variables: bedroom_variables || [],
          exclude_parameters: exclude_parameters || [],
          extras: extras || [],
          booking_form_scope,
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

    if (
      frequency?.is_default === true &&
      frequency.business_id &&
      frequency.industry_id &&
      frequency.id
    ) {
      await clearOtherIndustryFrequencyDefaults(
        supabase,
        frequency.business_id,
        frequency.industry_id,
        frequency.id,
        normalizeScope((frequency as { booking_form_scope?: string }).booking_form_scope),
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
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Frequency ID is required' },
        { status: 400 }
      );
    }

    const existing = await findFrequencyById(supabase, String(id));
    if (!existing) {
      return NextResponse.json({ error: 'Frequency not found' }, { status: 404 });
    }
    const allowed = await userCanManageBookingsForBusiness(supabase, user.id, existing.business_id);
    if (!allowed) {
      return createForbiddenResponse('You do not have access to this business');
    }
    if (updateData.business_id && String(updateData.business_id) !== existing.business_id) {
      return NextResponse.json({ error: 'business_id mismatch' }, { status: 400 });
    }
    if (updateData.industry_id && String(updateData.industry_id) !== existing.industry_id) {
      return NextResponse.json({ error: 'industry_id mismatch' }, { status: 400 });
    }

    const cleanedData: any = {
      updated_at: new Date().toISOString()
    };

    if (updateData.name !== undefined) cleanedData.name = updateData.name.trim();
    if (updateData.description !== undefined) cleanedData.description = updateData.description?.trim() || null;
    if (updateData.different_on_customer_end !== undefined) cleanedData.different_on_customer_end = updateData.different_on_customer_end;
    if (updateData.show_explanation !== undefined) cleanedData.show_explanation = updateData.show_explanation;
    if (updateData.enable_popup !== undefined) cleanedData.enable_popup = updateData.enable_popup;
    if (updateData.explanation_tooltip_text !== undefined) {
      cleanedData.explanation_tooltip_text = updateData.explanation_tooltip_text?.trim() || null;
    }
    if (updateData.popup_content !== undefined) {
      cleanedData.popup_content = updateData.popup_content?.trim() || null;
    }
    if (updateData.popup_display !== undefined) {
      cleanedData.popup_display = normalizeFrequencyPopupDisplay(updateData.popup_display);
    }
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
    if (updateData.show_based_on_location !== undefined) {
      cleanedData.show_based_on_location = updateData.show_based_on_location;
    }
    if (updateData.location_ids !== undefined) {
      cleanedData.location_ids = updateData.location_ids;
    }
    if (updateData.show_based_on_location === false) {
      cleanedData.location_ids = [];
    }
    if (updateData.service_categories !== undefined) cleanedData.service_categories = updateData.service_categories;
    if (updateData.bathroom_variables !== undefined) cleanedData.bathroom_variables = updateData.bathroom_variables;
    if (updateData.sqft_variables !== undefined) cleanedData.sqft_variables = updateData.sqft_variables;
    if (updateData.bedroom_variables !== undefined) cleanedData.bedroom_variables = updateData.bedroom_variables;
    if (updateData.exclude_parameters !== undefined) cleanedData.exclude_parameters = updateData.exclude_parameters;
    if (updateData.extras !== undefined) cleanedData.extras = updateData.extras;
    if (updateData.booking_form_scope !== undefined) {
      cleanedData.booking_form_scope = normalizeScope(updateData.booking_form_scope);
    }

    if (cleanedData.is_default === true) {
      const scope: BookingFormScope = normalizeScope(existing.booking_form_scope);
      await clearOtherIndustryFrequencyDefaults(
        supabase,
        existing.business_id,
        existing.industry_id,
        id,
        scope,
      );
    }

    const { data: frequency, error } = await supabase
      .from(existing.table)
      .update(cleanedData)
      .eq('id', id)
      .eq('business_id', existing.business_id)
      .eq('industry_id', existing.industry_id)
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
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';

    if (!id) {
      return NextResponse.json(
        { error: 'Frequency ID is required' },
        { status: 400 }
      );
    }
    const existing = await findFrequencyById(supabase, String(id));
    if (!existing) {
      return NextResponse.json({ error: 'Frequency not found' }, { status: 404 });
    }
    const allowed = await userCanManageBookingsForBusiness(supabase, user.id, existing.business_id);
    if (!allowed) {
      return createForbiddenResponse('You do not have access to this business');
    }

    if (permanent) {
      const { error } = await supabase
        .from(existing.table)
        .delete()
        .eq('id', id)
        .eq('business_id', existing.business_id)
        .eq('industry_id', existing.industry_id)
        .select('id');

      if (error) {
        console.error('Error permanently deleting frequency:', error);
        return NextResponse.json(
          { error: `Failed to delete frequency: ${error.message}` },
          { status: 500 }
        );
      }
    } else {
      const { error } = await supabase
        .from(existing.table)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('business_id', existing.business_id)
        .eq('industry_id', existing.industry_id)
        .select('id');

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
