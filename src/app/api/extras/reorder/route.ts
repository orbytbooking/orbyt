import { NextRequest, NextResponse } from 'next/server';
import { extrasService } from '@/lib/extras';
import { requireIndustryBelongsToBusiness } from '@/lib/industryTenantGuard';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates, industryId, businessId, business_id } = body;
    const resolvedBusinessId = businessId ?? business_id;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Updates array is required' },
        { status: 400 }
      );
    }

    // Validate each update has required fields
    for (const update of updates) {
      if (!update.id || typeof update.sort_order !== 'number') {
        return NextResponse.json(
          { error: 'Each update must have id and sort_order' },
          { status: 400 }
        );
      }
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
    const tenant = await requireIndustryBelongsToBusiness(
      supabaseAdmin,
      String(resolvedBusinessId),
      String(industryId),
    );
    if (!tenant.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await extrasService.updateExtraOrder(updates, {
      business_id: String(resolvedBusinessId),
      industry_id: String(industryId),
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering extras:', error);
    return NextResponse.json(
      { error: 'Failed to reorder extras' },
      { status: 500 }
    );
  }
}
