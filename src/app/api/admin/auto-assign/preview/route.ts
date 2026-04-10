import { NextRequest, NextResponse } from 'next/server';
import { getEligibilityPreview } from '@/lib/autoAssign';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';

/** GET - Preview provider eligibility (scores and reasons) for a hypothetical booking. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase: supabaseAdmin, businessId } = ctx;

    const { searchParams } = new URL(request.url);
    const hinted =
      searchParams.get('businessId')?.trim() ||
      request.headers.get('x-business-id')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const date = searchParams.get('date');
    const serviceId = searchParams.get('serviceId');
    const durationMinutes = searchParams.get('durationMinutes');

    const providers = await getEligibilityPreview(supabaseAdmin, businessId, {
      scheduledDate: date || undefined,
      serviceId: serviceId || undefined,
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : undefined,
    });

    return NextResponse.json({ providers });
  } catch (error: unknown) {
    console.error('Auto-assign preview error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
