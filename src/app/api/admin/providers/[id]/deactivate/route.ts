import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * POST /api/admin/providers/[id]/deactivate
 * BookingKoala-style deactivation: optionally unassign from upcoming bookings, then set status to inactive.
 * Body: { unassignBookings?: boolean, excludeNotification?: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { unassignBookings = false } = body;

    if (!id) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify provider exists and get business_id
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('service_providers')
      .select('id, business_id')
      .eq('id', id)
      .single();

    if (providerError || !provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    if (unassignBookings) {
      // Unassign provider from upcoming/pending bookings (date >= today, status in confirmed/pending)
      const today = new Date().toISOString().split('T')[0];
      const { data: bookingsToUnassign } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('provider_id', id)
        .eq('business_id', provider.business_id)
        .in('status', ['confirmed', 'pending', 'in_progress'])
        .gte('scheduled_date', today);

      if (bookingsToUnassign && bookingsToUnassign.length > 0) {
        const { error: unassignError } = await supabaseAdmin
          .from('bookings')
          .update({
            provider_id: null,
            status: 'pending', // Move to unassigned
            updated_at: new Date().toISOString(),
          })
          .eq('provider_id', id)
          .eq('business_id', provider.business_id)
        .in('status', ['confirmed', 'pending', 'in_progress'])
        .gte('scheduled_date', today);

        if (unassignError) {
          console.error('Error unassigning bookings:', unassignError);
          return NextResponse.json(
            { error: 'Failed to unassign bookings before deactivation' },
            { status: 500 }
          );
        }
      }
    }

    // Update provider status to inactive
    const { data: updatedProvider, error: updateError } = await supabaseAdmin
      .from('service_providers')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error deactivating provider:', updateError);
      return NextResponse.json(
        { error: 'Failed to deactivate provider' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      provider: updatedProvider,
      message: 'Provider deactivated successfully',
    });
  } catch (error) {
    console.error('Deactivate provider error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
