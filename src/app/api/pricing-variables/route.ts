import { NextRequest, NextResponse } from 'next/server';
import { pricingVariablesService } from '@/lib/pricing-variables';
import { parseBookingFormScopeParam, type BookingFormScope } from '@/lib/bookingFormScope';
import { requireIndustryBelongsToBusiness } from '@/lib/industryTenantGuard';
import { supabaseAdmin } from '@/lib/supabaseClient';

function queryBusinessId(searchParams: URLSearchParams): string | null {
  return searchParams.get('businessId') || searchParams.get('business_id');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get('industryId');
    const businessId = queryBusinessId(searchParams);
    const bookingFormScope = parseBookingFormScopeParam(searchParams.get('bookingFormScope'));

    if (!industryId) {
      return NextResponse.json(
        { error: 'Industry ID is required' },
        { status: 400 }
      );
    }

    if (!businessId?.trim()) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }
    const tenant = await requireIndustryBelongsToBusiness(supabaseAdmin, businessId, industryId);
    if (!tenant.ok) {
      return NextResponse.json({ error: 'Pricing variables not found' }, { status: 404 });
    }

    const variables = await pricingVariablesService.getByIndustry(industryId, bookingFormScope, businessId);
    return NextResponse.json({ variables });
  } catch (error) {
    console.error('Error fetching pricing variables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing variables' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { industryId, businessId, variables: variablesPayload, variable } = body;

    if (!industryId || !businessId) {
      return NextResponse.json(
        { error: 'industryId and businessId are required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }
    const tenant = await requireIndustryBelongsToBusiness(supabaseAdmin, String(businessId), String(industryId));
    if (!tenant.ok) {
      return NextResponse.json({ error: 'Industry not found for this business' }, { status: 404 });
    }

    const bookingFormScope: BookingFormScope =
      parseBookingFormScopeParam(
        typeof body.bookingFormScope === 'string' ? body.bookingFormScope : null,
      ) ?? 'form1';

    // Create one item/variable (used by Form 2 Add item page flow)
    if (variable && typeof variable === 'object' && !Array.isArray(variable)) {
      const v = variable as Record<string, unknown>;
      const name = String(v.name ?? '').trim();
      const category = String(v.category ?? '').trim();
      if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }
      if (!category) {
        return NextResponse.json({ error: 'Category is required' }, { status: 400 });
      }
      const created = await pricingVariablesService.create({
        industry_id: industryId,
        business_id: businessId,
        booking_form_scope: bookingFormScope,
        name,
        category,
        description: String(v.description ?? ''),
        is_active: Boolean(v.is_active ?? true),
        different_on_customer_end: Boolean(v.different_on_customer_end),
        customer_end_name: v.customer_end_name == null ? null : String(v.customer_end_name),
        show_explanation_icon_on_form: Boolean(v.show_explanation_icon_on_form),
        explanation_tooltip_text:
          v.explanation_tooltip_text == null ? null : String(v.explanation_tooltip_text),
        enable_popup_on_selection: Boolean(v.enable_popup_on_selection),
        popup_content: String(v.popup_content ?? ''),
        popup_display: v.popup_display == null ? undefined : String(v.popup_display),
        display: v.display == null ? undefined : String(v.display),
        show_based_on_frequency: Boolean(v.show_based_on_frequency),
        frequency_options: Array.isArray(v.frequency_options)
          ? v.frequency_options.map((x) => String(x).trim()).filter(Boolean)
          : [],
        show_based_on_service_category: Boolean(v.show_based_on_service_category),
        service_category_options: Array.isArray(v.service_category_options)
          ? v.service_category_options.map((x) => String(x).trim()).filter(Boolean)
          : [],
      });
      return NextResponse.json({ variable: created });
    }

    if (!Array.isArray(variablesPayload)) {
      return NextResponse.json(
        { error: 'variables must be an array' },
        { status: 400 }
      );
    }

    const variables = await pricingVariablesService.saveBulk(
      industryId,
      businessId,
      variablesPayload,
      bookingFormScope,
    );
    return NextResponse.json({ variables });
  } catch (error) {
    console.error('Error saving pricing variables:', error);
    const message =
      error instanceof Error
        ? error.message
        : (error && typeof error === 'object' && 'message' in error)
          ? String((error as { message?: unknown }).message)
          : 'Failed to save pricing variables';
    return NextResponse.json(
      { error: message || 'Failed to save pricing variables' },
      { status: 500 }
    );
  }
}
