import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { seedForm1IndustryTemplate } from '@/lib/seedForm1IndustryTemplate';
import { seedForm2DefaultFrequenciesIfEmpty } from '@/lib/seedForm2DefaultFrequencies';
import { seedForm2DefaultServiceCategoriesIfEmpty } from '@/lib/seedForm2DefaultServiceCategories';
import { seedForm2DefaultPricingVariablesIfEmpty } from '@/lib/seedForm2DefaultPricingVariables';
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';
import { userCanManageBookingsForBusiness } from '@/lib/bookingApiAuth';

function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Remove Form1 / pricing rows that reference `industries.id` so the industry row can be deleted.
 * Order respects FKs (e.g. pricing parameters before pricing variable categories).
 */
async function deleteIndustryDependents(supabase: SupabaseClient, industryId: string): Promise<{ error: string | null }> {
  const tables = [
    'industry_pricing_parameter',
    'industry_pricing_variable',
    'industry_extras',
    'industry_exclude_parameter',
    'industry_frequency',
    'industry_location',
    'industry_service_category',
  ] as const;

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('industry_id', industryId);
    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        continue;
      }
      return { error: `${table}: ${error.message}` };
    }
  }

  const { error: leadsErr } = await supabase.from('leads').update({ industry_id: null }).eq('industry_id', industryId);
  if (leadsErr && !leadsErr.message?.includes('does not exist') && leadsErr.code !== '42P01') {
    return { error: `leads: ${leadsErr.message}` };
  }

  return { error: null };
}

// GET - Fetch all industries for a business (intentionally unauthenticated for public book-now / embeds).
// Rows are isolated with `.eq('business_id', businessId)`; only that tenant's industries are returned.
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const { data: industries, error } = await supabase
      .from('industries')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching industries:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return NextResponse.json({ error: 'Industries table not found. Please run the database migration first.' }, { status: 500 });
      }
      return NextResponse.json({ error: `Failed to fetch industries: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ industries });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a new industry (requires CRM session + access to `business_id`; prevents cross-tenant inserts).
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const user = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const {
      name,
      description,
      business_id,
      is_custom = false,
      seed_form1_template: seedForm1Body,
      customer_booking_form_layout: layoutBody,
    } = body;

    if (!name || !business_id) {
      return NextResponse.json({ error: 'Name and business_id are required' }, { status: 400 });
    }

    const allowed = await userCanManageBookingsForBusiness(supabase, user.id, business_id);
    if (!allowed) {
      return createForbiddenResponse('You do not have access to this business');
    }

    let seed_form1_template = true;
    if (typeof seedForm1Body === 'boolean') {
      seed_form1_template = seedForm1Body;
    } else {
      const { data: bizRow, error: bizErr } = await supabase
        .from('businesses')
        .select('default_seed_form1_template')
        .eq('id', business_id)
        .maybeSingle();
      if (!bizErr && bizRow && typeof (bizRow as { default_seed_form1_template?: boolean }).default_seed_form1_template === 'boolean') {
        seed_form1_template = (bizRow as { default_seed_form1_template: boolean }).default_seed_form1_template;
      }
    }

    const customer_booking_form_layout =
      layoutBody === 'form2' || layoutBody === 'form1' ? layoutBody : 'form1';

    let { data: industry, error } = await supabase
      .from('industries')
      .insert([
        {
          name: name.trim(),
          description: description?.trim() || null,
          business_id,
          is_custom,
          customer_booking_form_layout,
        }
      ])
      .select()
      .single();

    if (
      error &&
      (error.message?.includes('customer_booking_form_layout') &&
        (error.message?.includes('column') || error.message?.includes('schema')))
    ) {
      const retry = await supabase
        .from('industries')
        .insert([
          {
            name: name.trim(),
            description: description?.trim() || null,
            business_id,
            is_custom,
          }
        ])
        .select()
        .single();
      industry = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Error adding industry:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Industry already exists for this business' }, { status: 409 });
      }
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return NextResponse.json({ error: 'Industries table not found. Please run the database migration first.' }, { status: 500 });
      }
      return NextResponse.json({ error: `Failed to add industry: ${error.message}` }, { status: 500 });
    }

    let form1_template: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    if (seed_form1_template !== false && industry?.id) {
      form1_template = await seedForm1IndustryTemplate(supabase, business_id, industry.id);
      if (form1_template.error) {
        console.error('Form 1 template seed error:', form1_template.error);
      }
    }

    let form2_frequencies: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    let form2_service_categories: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    let form2_pricing_variables: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    if (customer_booking_form_layout === 'form2' && industry?.id) {
      form2_frequencies = await seedForm2DefaultFrequenciesIfEmpty(supabase, business_id, industry.id);
      if (form2_frequencies.error) {
        console.error('Form 2 default frequencies seed error:', form2_frequencies.error);
      }
      form2_service_categories = await seedForm2DefaultServiceCategoriesIfEmpty(
        supabase,
        business_id,
        industry.id,
      );
      if (form2_service_categories.error) {
        console.error('Form 2 default service categories seed error:', form2_service_categories.error);
      }
      form2_pricing_variables = await seedForm2DefaultPricingVariablesIfEmpty(
        supabase,
        business_id,
        industry.id,
      );
      if (form2_pricing_variables.error) {
        console.error('Form 2 default items (pricing variables) seed error:', form2_pricing_variables.error);
      }
    }

    return NextResponse.json(
      {
        industry,
        form1_template,
        form2_frequencies,
        form2_service_categories,
        form2_pricing_variables,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update industry (e.g. customer booking form layout). Requires CRM session + business access.
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const user = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) {
      return NextResponse.json({ error: 'Industry id is required' }, { status: 400 });
    }

    const { data: industryRow, error: industryLookupErr } = await supabase
      .from('industries')
      .select('id, business_id')
      .eq('id', id)
      .maybeSingle();

    if (industryLookupErr || !industryRow?.business_id) {
      return NextResponse.json({ error: 'Industry not found' }, { status: 404 });
    }

    const allowed = await userCanManageBookingsForBusiness(supabase, user.id, industryRow.business_id);
    if (!allowed) {
      return createForbiddenResponse('You do not have access to this industry');
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.customer_booking_form_layout === 'form1' || body.customer_booking_form_layout === 'form2') {
      update.customer_booking_form_layout = body.customer_booking_form_layout;
    }
    if (typeof body.name === 'string' && body.name.trim()) {
      update.name = body.name.trim();
    }
    if (body.description === null || typeof body.description === 'string') {
      update.description = body.description === null ? null : body.description.trim() || null;
    }

    if (Object.keys(update).length <= 1) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: industry, error } = await supabase
      .from('industries')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.message?.includes('customer_booking_form_layout') && error.message?.includes('column')) {
        return NextResponse.json(
          {
            error:
              'Database migration required: run database/migrations/119_industry_customer_booking_form_layout.sql',
          },
          { status: 500 },
        );
      }
      console.error('Industry PATCH error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let form2_frequencies: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    let form2_service_categories: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    let form2_pricing_variables: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    if (body.customer_booking_form_layout === 'form2' && industry?.id && industryRow.business_id) {
      const bid = industryRow.business_id as string;
      const iid = industry.id as string;
      form2_frequencies = await seedForm2DefaultFrequenciesIfEmpty(supabase, bid, iid);
      if (form2_frequencies.error) {
        console.error('Form 2 default frequencies seed error:', form2_frequencies.error);
      }
      form2_service_categories = await seedForm2DefaultServiceCategoriesIfEmpty(supabase, bid, iid);
      if (form2_service_categories.error) {
        console.error('Form 2 default service categories seed error:', form2_service_categories.error);
      }
      form2_pricing_variables = await seedForm2DefaultPricingVariablesIfEmpty(supabase, bid, iid);
      if (form2_pricing_variables.error) {
        console.error('Form 2 default items (pricing variables) seed error:', form2_pricing_variables.error);
      }
    }

    return NextResponse.json({
      industry,
      form2_frequencies,
      form2_service_categories,
      form2_pricing_variables,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove an industry (requires CRM session + access to the industry's business).
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const user = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get('id');

    if (!industryId) {
      return NextResponse.json({ error: 'Industry ID is required' }, { status: 400 });
    }

    const { data: industryRow, error: industryLookupErr } = await supabase
      .from('industries')
      .select('id, business_id')
      .eq('id', industryId)
      .maybeSingle();

    if (industryLookupErr || !industryRow?.business_id) {
      return NextResponse.json({ error: 'Industry not found' }, { status: 404 });
    }

    const allowed = await userCanManageBookingsForBusiness(supabase, user.id, industryRow.business_id);
    if (!allowed) {
      return createForbiddenResponse('You do not have access to this industry');
    }

    const { error: depError } = await deleteIndustryDependents(supabase, industryId);
    if (depError) {
      console.error('Error removing industry dependents:', depError);
      return NextResponse.json({ error: `Failed to remove industry data: ${depError}` }, { status: 500 });
    }

    const { error } = await supabase
      .from('industries')
      .delete()
      .eq('id', industryId);

    if (error) {
      console.error('Error deleting industry:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: `Failed to delete industry: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
