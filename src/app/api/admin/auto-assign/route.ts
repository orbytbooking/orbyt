import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { performAutoAssign } from '@/lib/autoAssign';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, businessId } = body;

    if (!bookingId || !businessId) {
      return NextResponse.json(
        { error: 'Booking ID and Business ID are required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const result = await performAutoAssign(supabaseAdmin, bookingId, businessId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        assignment: { providerName: result.assignment.providerName },
        message: `Booking automatically assigned to ${result.assignment.providerName}`,
      });
    }

    return NextResponse.json(
      { success: false, message: result.error ?? 'Auto-assign failed' },
      { status: result.error === 'Booking not found' ? 404 : 500 }
    );
  } catch (error: any) {
    console.error('Auto-assignment error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', details: 'Failed to auto-assign booking' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== GET ASSIGNMENT RULES API ===');
    
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get recent assignments with scores (for this business only, via booking)
    const { data: assignments, error } = await supabaseAdmin
      .from('booking_assignments')
      .select(`
        *,
        service_providers(first_name, last_name, email),
        bookings!inner(scheduled_date, scheduled_time, total_price, service, business_id)
      `)
      .eq('assignment_type', 'auto')
      .eq('bookings.business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching assignments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = {
      totalAutoAssignments: assignments?.length || 0,
      averageScore: assignments?.length > 0 
        ? assignments.reduce((sum, a) => sum + (a.auto_assignment_score || 0), 0) / assignments.length 
        : 0,
      recentAssignments: assignments?.map(a => ({
        id: a.id,
        bookingId: a.booking_id,
        providerName: a.service_providers 
          ? `${a.service_providers.first_name} ${a.service_providers.last_name}`
          : 'Unknown',
        service: a.bookings?.service || 'Unknown',
        score: a.auto_assignment_score,
        assignedAt: a.created_at
      })) || []
    };

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('Assignment rules API error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: 'Failed to fetch assignment rules'
      },
      { status: 500 }
    );
  }
}
