import { NextRequest, NextResponse } from 'next/server';
import { pricingParametersService } from '@/lib/pricing-parameters';
import { requireIndustryBelongsToBusiness } from '@/lib/industryTenantGuard';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates, industryId, businessId, business_id } = body;
    const resolvedBusinessId = businessId ?? business_id;

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Updates must be an array' },
        { status: 400 }
      );
    }

    if (!industryId || !resolvedBusinessId) {
      return NextResponse.json(
        { error: 'industryId and businessId are required' },
        { status: 400 },
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }
    const tenant = await requireIndustryBelongsToBusiness(supabaseAdmin, String(resolvedBusinessId), String(industryId));
    if (!tenant.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await pricingParametersService.updatePricingParameterOrder(updates, {
      business_id: resolvedBusinessId,
      industry_id: industryId,
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering pricing parameters:', error);
    return NextResponse.json(
      { error: 'Failed to reorder pricing parameters' },
      { status: 500 }
    );
  }
}
