import { NextRequest, NextResponse } from 'next/server';
import { extrasService, pickIndustryExtraWritePayload } from '@/lib/extras';
import { parseBookingFormScopeParam, parseListingKindParam } from '@/lib/bookingFormScope';
import { requireIndustryBelongsToBusiness } from '@/lib/industryTenantGuard';
import { supabaseAdmin } from '@/lib/supabaseClient';

function queryBusinessId(searchParams: URLSearchParams): string | null {
  return searchParams.get('businessId') || searchParams.get('business_id');
}

function messageFromUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error';
}

function supabaseErrorPayload(error: unknown) {
  const message = messageFromUnknownError(error);
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : undefined;
  const details =
    error && typeof error === 'object' && 'details' in error
      ? (error as { details: unknown }).details
      : undefined;
  const hint =
    error && typeof error === 'object' && 'hint' in error ? (error as { hint: unknown }).hint : undefined;

  let userMessage = message;
  if (code === 'PGRST204') {
    userMessage += ` Run pending SQL in database/migrations on your Supabase DB (e.g. 095_industry_extras_manual_multiply_pricing.sql, 116_industry_extras_customer_end_popup_apply_bookings.sql), then reload the schema or wait for the API cache to refresh.`;
  }

  return { userMessage, code, details, hint };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get('industryId');
    const businessId = queryBusinessId(searchParams);
    const bookingFormScope = parseBookingFormScopeParam(searchParams.get('bookingFormScope'));
    const listingKind = parseListingKindParam(searchParams.get('listingKind'));

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
      return NextResponse.json({ error: 'Extras not found' }, { status: 404 });
    }

    const extras = await extrasService.getExtrasByIndustry(industryId, {
      businessId,
      bookingFormScope,
      listingKind,
    });
    
    return NextResponse.json({ extras });
  } catch (error) {
    console.error('Error fetching extras:', error);
    return NextResponse.json(
      { error: 'Failed to fetch extras' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const extraData = pickIndustryExtraWritePayload(body) as Parameters<
      typeof extrasService.createExtra
    >[0];

    if (extraData.booking_form_scope !== 'form2') {
      extraData.booking_form_scope = 'form1';
    }
    if (extraData.listing_kind !== 'addon') {
      extraData.listing_kind = 'extra';
    }

    console.log('Received extra data:', JSON.stringify(extraData, null, 2));

    if (!extraData.industry_id) {
      return NextResponse.json(
        { error: 'Industry ID is required' },
        { status: 400 }
      );
    }

    if (!extraData.business_id) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    const name = typeof extraData.name === 'string' ? extraData.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    extraData.name = name;
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }
    const tenant = await requireIndustryBelongsToBusiness(
      supabaseAdmin,
      String(extraData.business_id),
      String(extraData.industry_id),
    );
    if (!tenant.ok) {
      return NextResponse.json({ error: 'Industry not found for this business' }, { status: 404 });
    }

    const extra = await extrasService.createExtra(extraData);
    
    console.log('Extra created successfully:', extra);
    return NextResponse.json({ extra }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating extra:', error);
    const { userMessage, code, details, hint } = supabaseErrorPayload(error);
    console.error('Supabase error:', code, details, hint);
    return NextResponse.json(
      {
        error: userMessage,
        details: details ?? hint ?? undefined,
        code: code || undefined,
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, business_id: bodyBusinessId, industry_id: bodyIndustryId, ...rest } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Extra ID is required' },
        { status: 400 }
      );
    }
    if (!bodyBusinessId || !bodyIndustryId) {
      return NextResponse.json(
        { error: 'business_id and industry_id are required' },
        { status: 400 },
      );
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }
    const tenantPut = await requireIndustryBelongsToBusiness(supabaseAdmin, bodyBusinessId, bodyIndustryId);
    if (!tenantPut.ok) {
      return NextResponse.json({ error: 'Extra not found' }, { status: 404 });
    }

    const updateData = pickIndustryExtraWritePayload(rest) as Record<string, unknown>;
    delete updateData.business_id;
    delete updateData.industry_id;

    const nameRaw = updateData.name;
    if (nameRaw !== undefined) {
      const name = typeof nameRaw === 'string' ? nameRaw.trim() : '';
      if (!name) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      updateData.name = name;
    }

    const extra = await extrasService.updateExtra(id, updateData, {
      business_id: bodyBusinessId,
      industry_id: bodyIndustryId,
    });
    
    return NextResponse.json({ extra });
  } catch (error: unknown) {
    console.error('Error updating extra:', error);
    const { userMessage, code, details, hint } = supabaseErrorPayload(error);
    return NextResponse.json(
      {
        error: userMessage,
        details: details ?? hint ?? undefined,
        code: code || undefined,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const industryId = searchParams.get('industryId');
    const businessId = queryBusinessId(searchParams);
    const permanent = searchParams.get('permanent') === 'true';

    if (!id) {
      return NextResponse.json(
        { error: 'Extra ID is required' },
        { status: 400 }
      );
    }
    if (!industryId || !businessId) {
      return NextResponse.json(
        { error: 'industryId and businessId are required' },
        { status: 400 },
      );
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }
    const tenantDel = await requireIndustryBelongsToBusiness(supabaseAdmin, businessId, industryId);
    if (!tenantDel.ok) {
      return NextResponse.json({ error: 'Extra not found' }, { status: 404 });
    }

    let result: { deleted: boolean };
    if (permanent) {
      result = await extrasService.permanentlyDeleteExtra(id, {
        business_id: businessId,
        industry_id: industryId,
      });
    } else {
      result = await extrasService.deleteExtra(id, {
        business_id: businessId,
        industry_id: industryId,
      });
    }
    if (!result.deleted) {
      return NextResponse.json({ error: 'Extra not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting extra:', error);
    return NextResponse.json(
      { error: 'Failed to delete extra' },
      { status: 500 }
    );
  }
}
