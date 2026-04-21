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
    const { industryId, businessId, variables: variablesPayload } = body;

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

    if (!Array.isArray(variablesPayload)) {
      return NextResponse.json(
        { error: 'variables must be an array' },
        { status: 400 }
      );
    }

    const bookingFormScope: BookingFormScope =
      parseBookingFormScopeParam(
        typeof body.bookingFormScope === 'string' ? body.bookingFormScope : null,
      ) ?? 'form1';

    const variables = await pricingVariablesService.saveBulk(
      industryId,
      businessId,
      variablesPayload,
      bookingFormScope,
    );
    return NextResponse.json({ variables });
  } catch (error) {
    console.error('Error saving pricing variables:', error);
    return NextResponse.json(
      { error: 'Failed to save pricing variables' },
      { status: 500 }
    );
  }
}
