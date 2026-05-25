import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from '@/lib/auth-helpers';
import { resolveTenantBusinessId } from '@/lib/tenantBusinessAccess';

export type ServiceSupabase = ReturnType<typeof createClient>;

/**
 * Authenticated admin CRM session + validated tenant business.
 * Use for service-role routes that must never operate on arbitrary business_id without access checks.
 */
export async function requireAdminTenantContext(
  request: NextRequest
): Promise<{ user: User; businessId: string; supabase: ServiceSupabase } | NextResponse> {
  const user = await getAuthenticatedUser();
  if (!user) return createUnauthorizedResponse();

  const userRole = user.user_metadata?.role || 'owner';
  if (userRole === 'customer') {
    return createForbiddenResponse('Customers cannot access admin endpoints');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const resolved = await resolveTenantBusinessId(supabase, user.id, request);
  if ('error' in resolved) {
    if (resolved.error === 'FORBIDDEN') {
      return createForbiddenResponse('You do not have access to this business');
    }
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  return { user, businessId: resolved.businessId, supabase };
}

/**
 * When businessId is explicitly supplied (header/body/query), ensure it matches the resolved tenant
 * for this session (prevents mixing body businessId with another tenant's cookie session).
 */
export function assertBusinessIdMatchesContext(
  explicitBusinessId: string | null | undefined,
  contextBusinessId: string
): NextResponse | null {
  if (!explicitBusinessId?.trim()) return null;
  if (explicitBusinessId.trim() === contextBusinessId) return null;
  return createForbiddenResponse('Business context does not match the active workspace');
}
