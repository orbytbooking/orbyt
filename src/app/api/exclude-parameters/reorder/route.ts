import { NextRequest, NextResponse } from 'next/server';
import { excludeParametersService } from '@/lib/exclude-parameters';
import { requireIndustryBelongsToBusiness } from '@/lib/industryTenantGuard';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';
import { userCanManageBookingsForBusiness } from '@/lib/bookingApiAuth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
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
    const allowed = await userCanManageBookingsForBusiness(
      supabaseAdmin,
      user.id,
      String(resolvedBusinessId),
    );
    if (!allowed) return createForbiddenResponse('You do not have access to this business');
    const tenant = await requireIndustryBelongsToBusiness(supabaseAdmin, String(resolvedBusinessId), String(industryId));
    if (!tenant.ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await excludeParametersService.updateExcludeParameterOrder(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering exclude parameters:', error);
    return NextResponse.json(
      { error: 'Failed to reorder exclude parameters' },
      { status: 500 }
    );
  }
}
