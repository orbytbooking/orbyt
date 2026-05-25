import { NextRequest, NextResponse } from 'next/server';
import { excludeParametersService } from '@/lib/exclude-parameters';
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';
import { userCanManageBookingsForBusiness } from '@/lib/bookingApiAuth';
import { requireIndustryBelongsToBusiness } from '@/lib/industryTenantGuard';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get('industryId');
    const id = searchParams.get('id');
    const businessId = searchParams.get('businessId') || searchParams.get('business_id');

    if (id) {
      if (!industryId) {
        return NextResponse.json(
          { error: 'industryId is required when fetching by id' },
          { status: 400 }
        );
      }
      if (!supabaseAdmin) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
      }
      const effectiveBusinessId =
        businessId ||
        (
          await supabaseAdmin
            .from('industries')
            .select('business_id')
            .eq('id', industryId)
            .maybeSingle()
        ).data?.business_id ||
        null;
      if (!effectiveBusinessId) {
        return NextResponse.json({ error: 'Business not found for industry' }, { status: 404 });
      }
      const allowed = await userCanManageBookingsForBusiness(supabaseAdmin, user.id, effectiveBusinessId);
      if (!allowed) return createForbiddenResponse('You do not have access to this business');
      const tenant = await requireIndustryBelongsToBusiness(supabaseAdmin, effectiveBusinessId, industryId);
      if (!tenant.ok) {
        return NextResponse.json({ error: 'Exclude parameter not found' }, { status: 404 });
      }
      const param = await excludeParametersService.getExcludeParameterById(id, {
        business_id: effectiveBusinessId,
        industry_id: industryId,
      });
      if (!param || param.industry_id !== industryId) {
        return NextResponse.json({ error: 'Exclude parameter not found' }, { status: 404 });
      }
      return NextResponse.json({ excludeParameter: param });
    }

    if (!industryId) {
      return NextResponse.json(
        { error: 'Industry ID is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }
    const effectiveBusinessId =
      businessId ||
      (
        await supabaseAdmin
          .from('industries')
          .select('business_id')
          .eq('id', industryId)
          .maybeSingle()
      ).data?.business_id ||
      null;
    if (!effectiveBusinessId) {
      return NextResponse.json({ error: 'Business not found for industry' }, { status: 404 });
    }
    const allowed = await userCanManageBookingsForBusiness(supabaseAdmin, user.id, effectiveBusinessId);
    if (!allowed) return createForbiddenResponse('You do not have access to this business');
    const tenant = await requireIndustryBelongsToBusiness(supabaseAdmin, effectiveBusinessId, industryId);
    if (!tenant.ok) {
      return NextResponse.json({ error: 'Exclude parameters not found' }, { status: 404 });
    }

    const excludeParameters = await excludeParametersService.getExcludeParametersByIndustry(
      industryId,
      effectiveBusinessId,
    );
    return NextResponse.json({ excludeParameters });
  } catch (error) {
    console.error('💥 Error fetching exclude parameters:', error);
    console.error('💥 Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack available');
    
    return NextResponse.json(
      { error: 'Failed to fetch exclude parameters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const paramData = await request.json();
    
    console.log('Received exclude parameter data:', JSON.stringify(paramData, null, 2));

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
    const allowed = await userCanManageBookingsForBusiness(supabaseAdmin, user.id, String(paramData.business_id));
    if (!allowed) return createForbiddenResponse('You do not have access to this business');
    const tenant = await requireIndustryBelongsToBusiness(
      supabaseAdmin,
      String(paramData.business_id),
      String(paramData.industry_id),
    );
    if (!tenant.ok) {
      return NextResponse.json({ error: 'Industry not found for this business' }, { status: 404 });
    }

    const excludeParameter = await excludeParametersService.createExcludeParameter(paramData);
    
    console.log('Exclude parameter created successfully:', excludeParameter);
    return NextResponse.json({ excludeParameter }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating exclude parameter:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error?.stack);
    console.error('Supabase error:', error?.code, error?.details, error?.hint);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create exclude parameter',
        details: error?.details || error?.hint || undefined,
        code: error?.code || undefined
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const body = await request.json();
    const { id, business_id: bodyBusinessId, industry_id: bodyIndustryId, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Exclude parameter ID is required' },
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
    const allowed = await userCanManageBookingsForBusiness(supabaseAdmin, user.id, String(bodyBusinessId));
    if (!allowed) return createForbiddenResponse('You do not have access to this business');
    const tenant = await requireIndustryBelongsToBusiness(
      supabaseAdmin,
      String(bodyBusinessId),
      String(bodyIndustryId),
    );
    if (!tenant.ok) {
      return NextResponse.json({ error: 'Exclude parameter not found' }, { status: 404 });
    }
    const existing = await excludeParametersService.getExcludeParameterById(String(id), {
      business_id: String(bodyBusinessId),
      industry_id: String(bodyIndustryId),
    });
    if (!existing) {
      return NextResponse.json({ error: 'Exclude parameter not found' }, { status: 404 });
    }
    const excludeParameter = await excludeParametersService.updateExcludeParameter(
      id,
      updateData,
      { business_id: String(bodyBusinessId), industry_id: String(bodyIndustryId) },
    );
    
    return NextResponse.json({ excludeParameter });
  } catch (error) {
    console.error('Error updating exclude parameter:', error);
    return NextResponse.json(
      { error: 'Failed to update exclude parameter' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const industryId = searchParams.get('industryId');
    const businessId = searchParams.get('businessId') || searchParams.get('business_id');

    if (!id) {
      return NextResponse.json(
        { error: 'Exclude parameter ID is required' },
        { status: 400 }
      );
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }
    const existing = await excludeParametersService.getExcludeParameterById(String(id));
    if (!existing) {
      return NextResponse.json({ error: 'Exclude parameter not found' }, { status: 404 });
    }
    const effectiveIndustryId = industryId || existing.industry_id;
    const effectiveBusinessId = businessId || existing.business_id;
    const allowed = await userCanManageBookingsForBusiness(supabaseAdmin, user.id, effectiveBusinessId);
    if (!allowed) return createForbiddenResponse('You do not have access to this business');
    const tenant = await requireIndustryBelongsToBusiness(
      supabaseAdmin,
      effectiveBusinessId,
      effectiveIndustryId,
    );
    if (!tenant.ok) {
      return NextResponse.json({ error: 'Exclude parameter not found' }, { status: 404 });
    }
    await excludeParametersService.deleteExcludeParameter(id, {
      business_id: effectiveBusinessId,
      industry_id: effectiveIndustryId,
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting exclude parameter:', error);
    return NextResponse.json(
      { error: 'Failed to delete exclude parameter' },
      { status: 500 }
    );
  }
}
