import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { seedForm1IndustryTemplate } from '@/lib/seedForm1IndustryTemplate';
import { seedForm2DefaultFrequenciesIfEmpty } from '@/lib/seedForm2DefaultFrequencies';
import { seedForm2DefaultServiceCategoriesIfEmpty } from '@/lib/seedForm2DefaultServiceCategories';
import { seedForm2DefaultPricingVariablesIfEmpty } from '@/lib/seedForm2DefaultPricingVariables';
import { backfillForm2DefaultDependencyConfig } from '@/lib/seedForm2DefaultDependencies';
import {
  backfillForm2DefaultPackageIcons,
  backfillForm2PackageItemLinks,
  seedForm2DefaultPackagesIfEmpty,
} from '@/lib/seedForm2DefaultPackages';
import { seedForm3DefaultFrequenciesIfEmpty } from '@/lib/seedForm3DefaultFrequencies';
import { seedForm3DefaultServiceCategoriesIfEmpty } from '@/lib/seedForm3DefaultServiceCategories';
import { seedForm3DefaultItemsIfEmpty } from '@/lib/seedForm3DefaultItems';
import { seedForm4DefaultsIfEmpty } from '@/lib/seedForm4Defaults';
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
      layoutBody === 'form5' ||
      layoutBody === 'form4' ||
      layoutBody === 'form3' ||
      layoutBody === 'form2' ||
      layoutBody === 'form1'
        ? layoutBody
        : 'form1';

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
    if (
      seed_form1_template !== false &&
      industry?.id &&
      customer_booking_form_layout !== 'form3' &&
      customer_booking_form_layout !== 'form4' &&
      customer_booking_form_layout !== 'form5'
    ) {
      form1_template = await seedForm1IndustryTemplate(supabase, business_id, industry.id);
      if (form1_template.error) {
        console.error('Form 1 template seed error:', form1_template.error);
      }
    }

    let form2_frequencies: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    let form2_service_categories: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    let form2_pricing_variables: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    let form2_packages: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    let form2_package_item_links:
      | { applied: boolean; skipped?: boolean; updated?: number; error?: string }
      | undefined;
    let form2_package_gaps: { applied: boolean; skipped?: boolean; inserted?: number; error?: string } | undefined;
    let form4_defaults: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    let form5_defaults: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    let form3_frequencies: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    let form3_service_categories: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    let form3_items: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    if (customer_booking_form_layout === 'form4' && industry?.id) {
      form4_defaults = await seedForm4DefaultsIfEmpty(supabase, business_id, industry.id);
      if (form4_defaults.error) {
        console.error('Form 4 default catalog seed error:', form4_defaults.error);
      }
    }
    if (customer_booking_form_layout === 'form5' && industry?.id) {
      form5_defaults = await seedForm4DefaultsIfEmpty(supabase, business_id, industry.id, {
        bookingFormScope: 'form5',
        seedExtras: false,
      });
      if (form5_defaults.error) {
        console.error('Form 5 default catalog seed error:', form5_defaults.error);
      }
    }
    if (customer_booking_form_layout === 'form3' && industry?.id) {
      form3_frequencies = await seedForm3DefaultFrequenciesIfEmpty(supabase, business_id, industry.id);
      if (form3_frequencies.error) {
        console.error('Form 3 default frequencies seed error:', form3_frequencies.error);
      }
      form3_service_categories = await seedForm3DefaultServiceCategoriesIfEmpty(
        supabase,
        business_id,
        industry.id,
      );
      if (form3_service_categories.error) {
        console.error('Form 3 default service categories seed error:', form3_service_categories.error);
      }
      form3_items = await seedForm3DefaultItemsIfEmpty(supabase, business_id, industry.id);
      if (form3_items.error) {
        console.error('Form 3 default items seed error:', form3_items.error);
      }
    }

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
      form2_packages = await seedForm2DefaultPackagesIfEmpty(supabase, business_id, industry.id);
      if (form2_packages.error) {
        console.error('Form 2 default packages seed error:', form2_packages.error);
      }
      const form2_package_icons = await backfillForm2DefaultPackageIcons(
        supabase,
        business_id,
        industry.id,
      );
      if (form2_package_icons.error) {
        console.error('Form 2 default package icon backfill error:', form2_package_icons.error);
      }
      form2_package_item_links = await backfillForm2PackageItemLinks(
        supabase,
        business_id,
        industry.id,
      );
      if (form2_package_item_links.error) {
        console.error('Form 2 package item link backfill error:', form2_package_item_links.error);
      }
      const form2_dependency_config = await backfillForm2DefaultDependencyConfig(
        supabase,
        business_id,
        industry.id,
      );
      if (form2_dependency_config.error) {
        console.error('Form 2 default dependency config backfill error:', form2_dependency_config.error);
      }
      // Intentionally do not auto-fill missing package rows in existing Form 2 industries.
      // This keeps package presets fully user-customizable (deleted presets stay deleted).
    }

    return NextResponse.json(
      {
        industry,
        form1_template,
        form2_frequencies,
        form2_service_categories,
        form2_pricing_variables,
        form2_packages,
        form2_package_item_links,
        form2_package_gaps,
        form4_defaults,
        form5_defaults,
        form3_frequencies,
        form3_service_categories,
        form3_items,
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

    if (
      body.customer_booking_form_layout === 'form1' ||
      body.customer_booking_form_layout === 'form2' ||
      body.customer_booking_form_layout === 'form3' ||
      body.customer_booking_form_layout === 'form4' ||
      body.customer_booking_form_layout === 'form5'
    ) {
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
    let form2_packages: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    let form2_package_item_links:
      | { applied: boolean; skipped?: boolean; updated?: number; error?: string }
      | undefined;
    let form2_package_gaps: { applied: boolean; skipped?: boolean; inserted?: number; error?: string } | undefined;
    let form4_defaults: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    let form5_defaults: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    let form3_frequencies: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    let form3_service_categories: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    let form3_items: { applied: boolean; skipped?: boolean; error?: string } | undefined;
    if (body.customer_booking_form_layout === 'form4' && industry?.id && industryRow.business_id) {
      const bid = industryRow.business_id as string;
      const iid = industry.id as string;
      form4_defaults = await seedForm4DefaultsIfEmpty(supabase, bid, iid);
      if (form4_defaults.error) {
        console.error('Form 4 default catalog seed error:', form4_defaults.error);
      }
    }
    if (body.customer_booking_form_layout === 'form5' && industry?.id && industryRow.business_id) {
      const bid = industryRow.business_id as string;
      const iid = industry.id as string;
      form5_defaults = await seedForm4DefaultsIfEmpty(supabase, bid, iid, {
        bookingFormScope: 'form5',
        seedExtras: false,
      });
      if (form5_defaults.error) {
        console.error('Form 5 default catalog seed error:', form5_defaults.error);
      }
    }
    if (body.customer_booking_form_layout === 'form3' && industry?.id && industryRow.business_id) {
      const bid = industryRow.business_id as string;
      const iid = industry.id as string;
      form3_frequencies = await seedForm3DefaultFrequenciesIfEmpty(supabase, bid, iid);
      if (form3_frequencies.error) {
        console.error('Form 3 default frequencies seed error:', form3_frequencies.error);
      }
      form3_service_categories = await seedForm3DefaultServiceCategoriesIfEmpty(supabase, bid, iid);
      if (form3_service_categories.error) {
        console.error('Form 3 default service categories seed error:', form3_service_categories.error);
      }
      form3_items = await seedForm3DefaultItemsIfEmpty(supabase, bid, iid);
      if (form3_items.error) {
        console.error('Form 3 default items seed error:', form3_items.error);
      }
    }

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
      form2_packages = await seedForm2DefaultPackagesIfEmpty(supabase, bid, iid);
      if (form2_packages.error) {
        console.error('Form 2 default packages seed error:', form2_packages.error);
      }
      const form2_package_icons_patch = await backfillForm2DefaultPackageIcons(supabase, bid, iid);
      if (form2_package_icons_patch.error) {
        console.error('Form 2 default package icon backfill error:', form2_package_icons_patch.error);
      }
      form2_package_item_links = await backfillForm2PackageItemLinks(supabase, bid, iid);
      if (form2_package_item_links.error) {
        console.error('Form 2 package item link backfill error:', form2_package_item_links.error);
      }
      const form2_dependency_config_patch = await backfillForm2DefaultDependencyConfig(supabase, bid, iid);
      if (form2_dependency_config_patch.error) {
        console.error('Form 2 default dependency config backfill error:', form2_dependency_config_patch.error);
      }
      // Intentionally do not auto-fill missing package rows in existing Form 2 industries.
      // This keeps package presets fully user-customizable (deleted presets stay deleted).
    }

    return NextResponse.json({
      industry,
      form4_defaults,
      form5_defaults,
      form2_frequencies,
      form2_service_categories,
      form2_pricing_variables,
      form2_packages,
      form2_package_item_links,
      form2_package_gaps,
      form3_frequencies,
      form3_service_categories,
      form3_items,
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
