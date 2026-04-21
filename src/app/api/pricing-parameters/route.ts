import { NextRequest, NextResponse } from 'next/server';
import { pricingParametersService } from '@/lib/pricing-parameters';
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
    const id = searchParams.get('id');
    const businessId = queryBusinessId(searchParams);
    const bookingFormScope = parseBookingFormScopeParam(searchParams.get('bookingFormScope'));

    if (!businessId?.trim()) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }

    if (id) {
      if (!industryId) {
        return NextResponse.json(
          { error: 'industryId is required when fetching by id' },
          { status: 400 }
        );
      }
      const tenant = await requireIndustryBelongsToBusiness(supabaseAdmin, businessId, industryId);
      if (!tenant.ok) {
        return NextResponse.json({ error: 'Pricing parameter not found' }, { status: 404 });
      }
      const param = await pricingParametersService.getPricingParameterById(id, {
        business_id: businessId,
        industry_id: industryId,
      });
      if (!param) {
        return NextResponse.json({ error: 'Pricing parameter not found' }, { status: 404 });
      }
      return NextResponse.json({ pricingParameter: param });
    }

    if (!industryId) {
      return NextResponse.json(
        { error: 'Industry ID is required' },
        { status: 400 }
      );
    }

    const tenant = await requireIndustryBelongsToBusiness(supabaseAdmin, businessId, industryId);
    if (!tenant.ok) {
      return NextResponse.json({ error: 'Pricing parameters not found' }, { status: 404 });
    }

    const pricingParameters = await pricingParametersService.getPricingParametersByIndustry(
      industryId,
      businessId,
      bookingFormScope,
    );

    return NextResponse.json({ pricingParameters });
  } catch (error) {
    console.error('Error fetching pricing parameters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing parameters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const paramData = await request.json();
    
    console.log('Received pricing parameter data:', JSON.stringify(paramData, null, 2));

    if (!paramData.industry_id) {
      return NextResponse.json(
        { error: 'Industry ID is required' },
        { status: 400 }
      );
    }

    if (!paramData.business_id) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }
    const tenant = await requireIndustryBelongsToBusiness(
      supabaseAdmin,
      String(paramData.business_id),
      String(paramData.industry_id),
    );
    if (!tenant.ok) {
      return NextResponse.json({ error: 'Industry not found for this business' }, { status: 404 });
    }

    if (!paramData.variable_category) {
      return NextResponse.json(
        { error: 'Variable category is required' },
        { status: 400 }
      );
    }

    const booking_form_scope: BookingFormScope =
      paramData.booking_form_scope === 'form2' ? 'form2' : 'form1';
    paramData.booking_form_scope = booking_form_scope;

    const pricingParameter = await pricingParametersService.createPricingParameter(paramData);
    
    console.log('Pricing parameter created successfully:', pricingParameter);
    return NextResponse.json({ pricingParameter }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating pricing parameter:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error?.stack);
    console.error('Supabase error:', error?.code, error?.details, error?.hint);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create pricing parameter',
        details: error?.details || error?.hint || undefined,
        code: error?.code || undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, industry_id: bodyIndustryId, business_id: bodyBusinessId, ...updateData } = body;

    console.log('PUT - Received update data:', JSON.stringify(updateData, null, 2));
    console.log('PUT - Pricing parameter ID:', id);

    if (!id) {
      return NextResponse.json(
        { error: 'Pricing parameter ID is required' },
        { status: 400 }
      );
    }

    if (!bodyIndustryId || !bodyBusinessId) {
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
      return NextResponse.json({ error: 'Pricing parameter not found' }, { status: 404 });
    }

    const existing = await pricingParametersService.getPricingParameterById(id, {
      business_id: bodyBusinessId,
      industry_id: bodyIndustryId,
    });
    if (!existing) {
      return NextResponse.json({ error: 'Pricing parameter not found' }, { status: 404 });
    }
    if (existing.industry_id !== bodyIndustryId || existing.business_id !== bodyBusinessId) {
      return NextResponse.json({ error: 'Pricing parameter not found' }, { status: 404 });
    }

    const pricingParameter = await pricingParametersService.updatePricingParameter(id, updateData);
    
    console.log('PUT - Pricing parameter updated successfully:', pricingParameter);
    return NextResponse.json({ pricingParameter });
  } catch (error: any) {
    console.error('Error updating pricing parameter:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error?.stack);
    console.error('Supabase error:', error?.code, error?.details, error?.hint);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update pricing parameter',
        details: error?.details || error?.hint || undefined,
        code: error?.code || undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const industryId = searchParams.get('industryId');
    const businessId = queryBusinessId(searchParams);

    if (!id) {
      return NextResponse.json(
        { error: 'Pricing parameter ID is required' },
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
      return NextResponse.json({ error: 'Pricing parameter not found' }, { status: 404 });
    }

    const { deleted } = await pricingParametersService.deletePricingParameter(id, {
      business_id: businessId,
      industry_id: industryId,
    });

    if (!deleted) {
      return NextResponse.json({ error: 'Pricing parameter not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pricing parameter:', error);
    return NextResponse.json(
      { error: 'Failed to delete pricing parameter' },
      { status: 500 }
    );
  }
}
