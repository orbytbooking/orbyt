import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStoreOptionsScheduling, isDateHoliday } from '@/lib/schedulingFilters';

/**
 * GET /api/admin/providers/[id]/available-slots
 * Get available time slots for a provider on a specific date
 * Query params: date (YYYY-MM-DD)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Handle params as Promise for Next.js 15+
    const resolvedParams = await params;
    const providerId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
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
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get business ID from query params or headers for business isolation
    const { searchParams: urlSearchParams } = new URL(request.url);
    const businessId = urlSearchParams.get('businessId') || request.headers.get('x-business-id');

    // Get provider to verify it exists and belongs to the business
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('service_providers')
      .select('id, business_id, status')
      .eq('id', providerId)
      .single();

    if (providerError || !provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Deactivated providers cannot be assigned to bookings
    if (provider.status !== 'active') {
      return NextResponse.json(
        { error: 'Provider is not active and cannot be assigned', slots: [] },
        { status: 403 }
      );
    }

    // BUSINESS ISOLATION: Verify provider belongs to the requesting business
    if (businessId && provider.business_id !== businessId) {
      console.error(`Business isolation violation: Provider ${providerId} belongs to business ${provider.business_id}, but request is for business ${businessId}`);
      return NextResponse.json(
        { error: 'Provider not found or access denied' },
        { status: 403 }
      );
    }

    // Holiday check: when holiday_blocked_who is 'both', admin is also blocked
    const storeOpts = await getStoreOptionsScheduling(provider.business_id);
    if (storeOpts?.holiday_blocked_who === 'both') {
      const isHoliday = await isDateHoliday(provider.business_id, date);
      if (isHoliday) {
        return NextResponse.json({
          providerId,
          date,
          availableSlots: [],
          count: 0,
        });
      }
    }

    // Parse the date to get day of week
    // Parse date string (YYYY-MM-DD) directly to avoid timezone issues
    // We use UTC to ensure consistent day-of-week calculation regardless of server timezone
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.

    // Get recurring availability for this day of week
    // BUSINESS ISOLATION: Filter by business_id if provided
    let recurringQuery = supabaseAdmin
      .from('provider_availability')
      .select('start_time, end_time, is_available, effective_date, expiry_date')
      .eq('provider_id', providerId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true);
    
    // Add business_id filter if available (for business isolation)
    if (provider.business_id) {
      recurringQuery = recurringQuery.eq('business_id', provider.business_id);
    }
    
    const { data: recurringAvailability, error: recurringError } = await recurringQuery;

    console.log(`📅 Checking availability for provider ${providerId} on ${date} (day ${dayOfWeek}):`);
    console.log(`  - Recurring availability found: ${recurringAvailability?.length || 0} slots`);
    if (recurringError) {
      console.error('Error fetching recurring availability:', recurringError);
    }
    if (recurringAvailability && recurringAvailability.length > 0) {
      console.log('  - Recurring slots:', recurringAvailability.map(s => ({
        start: s.start_time,
        end: s.end_time,
        effective_date: s.effective_date,
        expiry_date: s.expiry_date
      })));
    }

    // Get specific date slots from provider_availability_slots
    // Note: provider_availability_slots doesn't have business_id column, but provider_id is already filtered
    // Check if table exists first to avoid errors
    let dateSlots: any[] = [];
    let slotsError: any = null;
    
    try {
      const slotsResult = await supabaseAdmin
        .from('provider_availability_slots')
        .select('start_time, end_time, is_available')
        .eq('provider_id', providerId)
        .eq('slot_date', date)
        .eq('is_available', true);
      
      dateSlots = slotsResult.data || [];
      slotsError = slotsResult.error;
      
      if (slotsError) {
        // If table doesn't exist, that's okay - we'll just use recurring availability
        if (slotsError.code === '42P01') {
          console.log('provider_availability_slots table does not exist, using only recurring availability');
          slotsError = null; // Clear error, continue with recurring slots only
        } else {
          console.error('Error fetching date slots:', slotsError);
        }
      }
    } catch (error: any) {
      // Handle case where table doesn't exist
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.log('provider_availability_slots table does not exist, using only recurring availability');
        slotsError = null;
      } else {
        console.error('Error fetching date slots:', error);
        slotsError = error;
      }
    }

    // Combine and process availability
    const availableSlots: string[] = [];
    const slotSet = new Set<string>();

    // Process recurring availability
    if (recurringAvailability) {
      for (const slot of recurringAvailability) {
        // Check if this recurring slot applies to the selected date
        let appliesToDate = true;

        // If there's an effective_date, check if it applies
        if (slot.effective_date) {
          // Normalize dates for comparison (remove time component if present)
          // Dates are stored as date strings (YYYY-MM-DD) or ISO strings, so we extract just the date part
          const effectiveDateStr = slot.effective_date instanceof Date 
            ? slot.effective_date.toISOString().split('T')[0]
            : slot.effective_date.toString().split('T')[0];
          const expiryDateStr = slot.expiry_date 
            ? (slot.expiry_date instanceof Date 
                ? slot.expiry_date.toISOString().split('T')[0]
                : slot.expiry_date.toString().split('T')[0])
            : null;
          
          // Compare date strings directly (YYYY-MM-DD format)
          // This avoids timezone issues since we're comparing date-only values
          if (expiryDateStr) {
            // Check if date is within range (string comparison works for YYYY-MM-DD format)
            appliesToDate = date >= effectiveDateStr && date <= expiryDateStr;
            console.log(`    - Checking date range: ${date} between ${effectiveDateStr} and ${expiryDateStr} -> ${appliesToDate}`);
          } else {
            // Only applies if date matches effective_date exactly
            appliesToDate = date === effectiveDateStr;
            console.log(`    - Checking exact date match: ${date} === ${effectiveDateStr} -> ${appliesToDate}`);
          }
        } else {
          // No effective_date means this is a recurring slot (applies every week)
          console.log(`    - Recurring slot (no effective_date) - applies to ${date}`);
        }

        if (appliesToDate && slot.is_available) {
          // Generate 30-minute slots between start_time and end_time
          const startTime = slot.start_time;
          const endTime = slot.end_time;

          // Parse times (format: HH:MM:SS)
          const [startHour, startMin] = startTime.split(':').map(Number);
          const [endHour, endMin] = endTime.split(':').map(Number);

          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;

          // Generate slots every 30 minutes
          for (
            let minutes = startMinutes;
            minutes < endMinutes;
            minutes += 30
          ) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const timeStr = `${hours.toString().padStart(2, '0')}:${mins
              .toString()
              .padStart(2, '0')}`;
            slotSet.add(timeStr);
          }
        }
      }
    }

    // Process specific date slots (these override recurring slots)
    if (dateSlots) {
      for (const slot of dateSlots) {
        if (slot.is_available) {
          const startTime = slot.start_time;
          const endTime = slot.end_time;

          // Parse times (format: HH:MM:SS)
          const [startHour, startMin] = startTime.split(':').map(Number);
          const [endHour, endMin] = endTime.split(':').map(Number);

          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;

          // Generate slots every 30 minutes
          for (
            let minutes = startMinutes;
            minutes < endMinutes;
            minutes += 30
          ) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const timeStr = `${hours.toString().padStart(2, '0')}:${mins
              .toString()
              .padStart(2, '0')}`;
            slotSet.add(timeStr);
          }
        }
      }
    }

    // Convert set to sorted array
    const sortedSlots = Array.from(slotSet).sort((a, b) => {
      const [aHour, aMin] = a.split(':').map(Number);
      const [bHour, bMin] = b.split(':').map(Number);
      return aHour * 60 + aMin - (bHour * 60 + bMin);
    });

    console.log(`  - Final available slots: ${sortedSlots.length} slots`);
    if (sortedSlots.length > 0) {
      console.log('  - Slots:', sortedSlots);
    } else {
      console.log('  - ⚠️ No available slots found for this date');
    }

    return NextResponse.json({
      providerId,
      date,
      availableSlots: sortedSlots,
      count: sortedSlots.length,
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
