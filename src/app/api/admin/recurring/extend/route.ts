import { NextRequest, NextResponse } from 'next/server';
import { extendAllRecurringSeries } from '@/lib/recurringBookings';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';

/** GET - Extend all active recurring series for the business (call on bookings/calendar load) */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      request.nextUrl.searchParams.get('businessId')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { extended, totalCreated } = await extendAllRecurringSeries(supabase, businessId);

    return NextResponse.json({
      success: true,
      extended,
      totalCreated,
    });
  } catch (e) {
    console.error('recurring/extend GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
