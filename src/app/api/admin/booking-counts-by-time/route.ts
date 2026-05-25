import { NextRequest, NextResponse } from 'next/server';
import { getBookingCountByTimeForDate, getBookingCountForDate } from '@/lib/schedulingFilters';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';

/** GET - Booking counts per time for a date (for Daily Settings grid) */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const date = request.nextUrl.searchParams.get('date'); // YYYY-MM-DD
    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      request.nextUrl.searchParams.get('businessId')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    if (!date) {
      return NextResponse.json({ error: 'date required' }, { status: 400 });
    }

    const countsByTime = await getBookingCountByTimeForDate(supabase, businessId, date);
    const totalScheduled = await getBookingCountForDate(supabase, businessId, date);

    return NextResponse.json({ countsByTime, totalScheduled });
  } catch (e) {
    console.error('Booking counts by time GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
