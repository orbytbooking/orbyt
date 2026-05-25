import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { userCanManageBookingsForBusiness } from '@/lib/bookingApiAuth';

export { userCanManageBookingsForBusiness };

/** True if the user is the business owner (can mutate tenant-wide settings). */
export async function userOwnsBusiness(
  supabase: SupabaseClient,
  userId: string,
  businessId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('owner_id', userId)
    .maybeSingle();
  return !!data;
}

/**
 * Resolves which business an admin session is operating in.
 * Order: x-business-id / businessId / business_id query → profiles.business_id → first owned business → first active tenant_users row.
 * Every candidate is checked with owner OR tenant_users access (same as bookings).
 */
export async function resolveTenantBusinessId(
  supabase: SupabaseClient,
  userId: string,
  request: NextRequest
): Promise<{ businessId: string } | { error: 'FORBIDDEN' | 'NOT_FOUND' }> {
  const param =
    request.headers.get('x-business-id')?.trim() ||
    request.nextUrl.searchParams.get('businessId')?.trim() ||
    request.nextUrl.searchParams.get('business_id')?.trim() ||
    null;

  if (param) {
    const ok = await userCanManageBookingsForBusiness(supabase, userId, param);
    if (!ok) return { error: 'FORBIDDEN' };
    return { businessId: param };
  }

  const { data: prof } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', userId)
    .maybeSingle();
  const profBid = typeof prof?.business_id === 'string' ? prof.business_id.trim() : '';
  if (profBid) {
    const ok = await userCanManageBookingsForBusiness(supabase, userId, profBid);
    if (ok) return { businessId: profBid };
  }

  const { data: owned } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (owned?.id) return { businessId: owned.id };

  const { data: tenant } = await supabase
    .from('tenant_users')
    .select('business_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (tenant?.business_id) {
    const ok = await userCanManageBookingsForBusiness(supabase, userId, tenant.business_id);
    if (ok) return { businessId: tenant.business_id };
  }

  return { error: 'NOT_FOUND' };
}
