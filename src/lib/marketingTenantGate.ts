import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from '@/lib/auth-helpers';
import { assertUserHasAdminModuleAccess } from '@/lib/bookingApiAuth';
import type { AdminModuleKey } from '@/lib/adminModulePermissions';

/** CRM session + owner or tenant_users + module flag; x-business-id must match supplied business id when both set. */
export async function gateCrmTenantModuleApi(
  request: NextRequest,
  businessId: string | null | undefined,
  moduleKey: AdminModuleKey
): Promise<NextResponse | null> {
  if (!businessId?.trim()) {
    return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
  }
  const bid = businessId.trim();
  const user = await getAuthenticatedUser();
  if (!user) return createUnauthorizedResponse();
  if (user.user_metadata?.role === 'customer') {
    return createForbiddenResponse('Customers cannot access this resource');
  }
  const headerBid = request.headers.get('x-business-id')?.trim();
  if (headerBid && headerBid !== bid) {
    return NextResponse.json({ error: 'Business context mismatch' }, { status: 403 });
  }
  const g = await assertUserHasAdminModuleAccess(user.id, bid, moduleKey);
  if (g === 'no_service_role') {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  if (g === 'denied') return createForbiddenResponse('You do not have access to this business');
  return null;
}

export function gateMarketingTenantApi(
  request: NextRequest,
  businessId: string | null | undefined
): Promise<NextResponse | null> {
  return gateCrmTenantModuleApi(request, businessId, 'marketing');
}
