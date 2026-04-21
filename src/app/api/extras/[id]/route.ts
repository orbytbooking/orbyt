import { NextRequest, NextResponse } from 'next/server';
import { extrasService } from '@/lib/extras';
import { requireIndustryBelongsToBusiness } from '@/lib/industryTenantGuard';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get('industryId');
    const businessId = searchParams.get('businessId') || searchParams.get('business_id');

    if (!id || id === 'undefined' || id === 'null') {
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
    const tenant = await requireIndustryBelongsToBusiness(supabaseAdmin, businessId, industryId);
    if (!tenant.ok) {
      return NextResponse.json({ error: 'Extra not found' }, { status: 404 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid Extra ID format' },
        { status: 400 }
      );
    }

    const extra = await extrasService.getExtraById(id, {
      business_id: businessId,
      industry_id: industryId,
    });
    
    if (!extra) {
      return NextResponse.json(
        { error: 'Extra not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ extra });
  } catch (error) {
    console.error('API Error fetching extra:', error);
    return NextResponse.json(
      { error: 'Failed to fetch extra' },
      { status: 500 }
    );
  }
}
