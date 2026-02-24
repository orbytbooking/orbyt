import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getEligibilityPreview } from '@/lib/autoAssign';

/** GET - Preview provider eligibility (scores and reasons) for a hypothetical booking. No auth for server-side use. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    const date = searchParams.get('date');
    const serviceId = searchParams.get('serviceId');
    const durationMinutes = searchParams.get('durationMinutes');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const providers = await getEligibilityPreview(supabaseAdmin, businessId, {
      scheduledDate: date || undefined,
      serviceId: serviceId || undefined,
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : undefined,
    });

    return NextResponse.json({ providers });
  } catch (error: any) {
    console.error('Auto-assign preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
