import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { getStoreOptionsScheduling, isDateHoliday, getSpotLimits, getBookingCountForDate } from '@/lib/schedulingFilters';

export async function GET(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }
    
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    const date = searchParams.get('date'); // YYYY-MM-DD format

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const storeOpts = await getStoreOptionsScheduling(businessId);

    // Holiday check: if customer is blocked on holidays, return empty for holiday dates
    const holidayBlocked = storeOpts?.holiday_blocked_who === 'customer' || storeOpts?.holiday_blocked_who === 'both';
    if (date && holidayBlocked) {
      const isHoliday = await isDateHoliday(businessId, date);
      if (isHoliday) {
        return NextResponse.json({ timeSlots: [] });
      }
    }

    // Spot limits: if enabled and day at capacity, return empty
    if (date && storeOpts?.spot_limits_enabled) {
      const limits = await getSpotLimits(businessId);
      if (limits?.enabled && limits.max_bookings_per_day > 0) {
        const count = await getBookingCountForDate(supabaseAdmin, businessId, date);
        if (count >= limits.max_bookings_per_day) {
          return NextResponse.json({ timeSlots: [] });
        }
      }
    }

    // Spots based on provider availability: when false, return default full-day slots (no provider filter)
    const useProviderAvailability = storeOpts?.spots_based_on_provider_availability ?? true;
    if (!useProviderAvailability && date) {
      const defaultSlots: string[] = [];
      for (let h = 7; h < 20; h++) {
        defaultSlots.push(
          new Date(2000, 0, 1, h, 0, 0).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          new Date(2000, 0, 1, h, 30, 0).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        );
      }
      return NextResponse.json({ timeSlots: defaultSlots });
    }

    // Get the day of week from the date (0 = Sunday, 1 = Monday, etc.)
    let dayOfWeek = new Date().getDay(); // Default to today
    if (date) {
      dayOfWeek = new Date(date).getDay();
    }

    // Fetch provider availability for the given day of week and business
    const { data: availability, error } = await supabaseAdmin
      .from('provider_availability')
      .select('start_time, end_time')
      .eq('business_id', businessId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)
      .order('start_time');

    if (error) {
      console.error('Error fetching time slots:', error);
      return NextResponse.json({ error: 'Failed to fetch time slots' }, { status: 500 });
    }

    // Convert time slots to readable format and generate full range
    const timeSlots = availability?.map(slot => {
      const startTime = new Date(`2000-01-01T${slot.start_time}`);
      const endTime = new Date(`2000-01-01T${slot.end_time}`);
      
      // Format as "9:00 AM", "11:00 AM", etc.
      return {
        start: startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        end: endTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        startTimeObj: startTime,
        endTimeObj: endTime
      };
    }) || [];

    // Generate complete time range from earliest start to latest end
    let fullTimeSlots = [];
    
    if (timeSlots.length > 0) {
      // Find earliest start time and latest end time
      const earliestStart = new Date(Math.min(...timeSlots.map(s => s.startTimeObj.getTime())));
      const latestEnd = new Date(Math.max(...timeSlots.map(s => s.endTimeObj.getTime())));
      
      // Generate time slots every 30 minutes from start to end
      const currentTime = new Date(earliestStart);
      
      while (currentTime < latestEnd) {
        const timeString = currentTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        fullTimeSlots.push(timeString);
        
        // Add 30 minutes
        currentTime.setMinutes(currentTime.getMinutes() + 30);
      }
    }

    // If no availability found, return default time slots for full day
    if (fullTimeSlots.length === 0) {
      // Generate time slots from 7:00 AM to 8:00 PM every hour
      const defaultSlots = [];
      const currentTime = new Date();
      currentTime.setHours(7, 0, 0, 0); // 7:00 AM
      
      while (currentTime.getHours() < 20) { // Until 8:00 PM
        const timeString = currentTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        defaultSlots.push(timeString);
        
        // Add 1 hour
        currentTime.setHours(currentTime.getHours() + 1);
      }
      
      return NextResponse.json({ timeSlots: defaultSlots });
    }

    return NextResponse.json({ timeSlots: fullTimeSlots });

  } catch (error) {
    console.error('Error in time-slots API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
