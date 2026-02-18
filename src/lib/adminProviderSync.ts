// Admin-Provider synchronization utilities
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export interface ProviderStatusUpdate {
  providerId: string;
  businessId: string;
  status: 'available' | 'busy' | 'unavailable' | 'on_vacation';
  currentBookingId?: string;
  location?: string;
}

export interface BookingStatusUpdate {
  bookingId: string;
  providerId: string;
  businessId: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  timestamp: string;
}

export interface ProviderEarningUpdate {
  providerId: string;
  businessId: string;
  bookingId: string;
  amount: number;
  commissionRate: number;
  netAmount: number;
  status: 'pending' | 'approved' | 'paid';
}

/**
 * Sync provider status changes to admin dashboard
 */
export async function syncProviderStatusToAdmin(update: ProviderStatusUpdate) {
  try {
    // Update provider availability status
    const { error } = await supabaseAdmin
      .from('service_providers')
      .update({
        availability_status: update.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', update.providerId)
      .eq('business_id', update.businessId);

    if (error) throw error;

    // Log status change for admin tracking
    await supabaseAdmin
      .from('provider_activity_logs')
      .insert({
        provider_id: update.providerId,
        business_id: update.businessId,
        activity_type: 'status_change',
        old_status: null, // Would need to fetch previous status
        new_status: update.status,
        metadata: {
          currentBookingId: update.currentBookingId,
          location: update.location,
          timestamp: new Date().toISOString()
        }
      });

    return { success: true };
  } catch (error) {
    console.error('Error syncing provider status:', error);
    return { success: false, error };
  }
}

/**
 * Sync booking status changes from provider to admin
 */
export async function syncBookingStatusToAdmin(update: BookingStatusUpdate) {
  try {
    // Update booking status
    const { error } = await supabaseAdmin
      .from('bookings')
      .update({
        status: update.status,
        updated_at: new Date().toISOString(),
        provider_notes: update.notes
      })
      .eq('id', update.bookingId)
      .eq('provider_id', update.providerId)
      .eq('business_id', update.businessId);

    if (error) throw error;

    // Create booking assignment record if not exists
    if (update.status === 'confirmed' || update.status === 'in_progress') {
      await supabaseAdmin
        .from('booking_assignments')
        .upsert({
          booking_id: update.bookingId,
          provider_id: update.providerId,
          business_id: update.businessId,
          assignment_type: 'manual',
          status: 'accepted',
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'booking_id,provider_id'
        });
    }

    // Trigger earnings calculation for completed bookings
    if (update.status === 'completed') {
      await calculateProviderEarnings(update.bookingId, update.providerId, update.businessId);
    }

    return { success: true };
  } catch (error) {
    console.error('Error syncing booking status:', error);
    return { success: false, error };
  }
}

/**
 * Calculate and record provider earnings
 */
export async function calculateProviderEarnings(bookingId: string, providerId: string, businessId: string) {
  try {
    // Get booking details including provider wage override
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('total_price, service_id, provider_wage, provider_wage_type, scheduled_date, scheduled_time, notes')
      .eq('id', bookingId)
      .eq('provider_id', providerId)
      .eq('business_id', businessId)
      .single();

    if (bookingError || !booking) throw bookingError;

    const grossAmount = booking.total_price;
    let commissionAmount = 0;
    let netAmount = 0;
    let payRateType = 'percentage';
    let usedBookingWage = false;

    // Priority 1: Use booking-specific provider_wage if set (per-booking override)
    if (booking.provider_wage !== null && booking.provider_wage !== undefined && booking.provider_wage_type) {
      usedBookingWage = true;
      payRateType = booking.provider_wage_type;

      if (booking.provider_wage_type === 'percentage') {
        // Percentage of booking total
        netAmount = (grossAmount * booking.provider_wage) / 100;
        commissionAmount = grossAmount - netAmount;
      } else if (booking.provider_wage_type === 'fixed') {
        // Fixed dollar amount
        netAmount = booking.provider_wage;
        commissionAmount = grossAmount - netAmount;
      } else if (booking.provider_wage_type === 'hourly') {
        // Hourly rate - need to calculate hours from duration
        // Try to extract duration from notes or use default
        let hours = 1; // Default to 1 hour
        const durationMatch = booking.notes?.match(/(\d+)\s*(?:hour|hr|h)/i);
        if (durationMatch) {
          hours = parseFloat(durationMatch[1]) || 1;
        }
        netAmount = booking.provider_wage * hours;
        commissionAmount = grossAmount - netAmount;
      }
    } else {
      // Priority 2: Use provider's default pay rate from provider_pay_rates table
      const { data: payRate, error: payRateError } = await supabaseAdmin
        .from('provider_pay_rates')
        .select('*')
        .eq('provider_id', providerId)
        .eq('business_id', businessId)
        .eq('service_id', booking.service_id)
        .eq('is_active', true)
        .single();

      if (payRateError) {
        console.warn('No specific pay rate found, using default');
      }

      if (payRate) {
        payRateType = payRate.rate_type;
        if (payRate.rate_type === 'percentage') {
          commissionAmount = (grossAmount * (payRate.percentage_rate || 0)) / 100;
          netAmount = grossAmount - commissionAmount;
        } else if (payRate.rate_type === 'flat') {
          netAmount = payRate.flat_rate || 0;
          commissionAmount = grossAmount - netAmount;
        } else if (payRate.rate_type === 'hourly') {
          // Try to extract duration from notes or use default
          let hours = 1;
          const durationMatch = booking.notes?.match(/(\d+)\s*(?:hour|hr|h)/i);
          if (durationMatch) {
            hours = parseFloat(durationMatch[1]) || 1;
          }
          netAmount = (payRate.hourly_rate || 0) * hours;
          commissionAmount = grossAmount - netAmount;
        }
      } else {
        // Priority 3: Default 80/20 split if no pay rate configured
        payRateType = 'percentage';
        commissionAmount = grossAmount * 0.2;
        netAmount = grossAmount * 0.8;
      }
    }

    // Ensure amounts are valid
    if (netAmount < 0) netAmount = 0;
    if (commissionAmount < 0) commissionAmount = 0;
    if (netAmount + commissionAmount > grossAmount) {
      // Adjust if total exceeds gross
      netAmount = Math.max(0, grossAmount - commissionAmount);
    }

    // Record earnings
    const earningsData: any = {
      provider_id: providerId,
      business_id: businessId,
      booking_id: bookingId,
      service_id: booking.service_id,
      gross_amount: grossAmount,
      commission_amount: commissionAmount,
      net_amount: netAmount,
      pay_rate_type: payRateType,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Store the actual rate values used for transparency
    if (usedBookingWage && booking.provider_wage !== null) {
      if (booking.provider_wage_type === 'percentage') {
        earningsData.percentage_rate_used = booking.provider_wage;
      } else if (booking.provider_wage_type === 'fixed') {
        earningsData.flat_rate_used = booking.provider_wage;
      } else if (booking.provider_wage_type === 'hourly') {
        earningsData.hourly_rate_used = booking.provider_wage;
        // Try to extract and store hours worked
        let hours = 1;
        const durationMatch = booking.notes?.match(/(\d+)\s*(?:hour|hr|h)/i);
        if (durationMatch) {
          hours = parseFloat(durationMatch[1]) || 1;
        }
        earningsData.hours_worked = hours;
      }
    }

    const { error: earningsError } = await supabaseAdmin
      .from('provider_earnings')
      .insert(earningsData);

    if (earningsError) throw earningsError;

    console.log(`✅ Provider earnings calculated: ${usedBookingWage ? 'Used booking-specific wage' : 'Used provider default pay rate'}`, {
      bookingId,
      providerId,
      grossAmount,
      netAmount,
      commissionAmount,
      payRateType
    });

    return { success: true, earnings: { grossAmount, commissionAmount, netAmount, usedBookingWage } };
  } catch (error) {
    console.error('Error calculating earnings:', error);
    return { success: false, error };
  }
}

/**
 * Get provider performance metrics for admin dashboard
 */
export async function getProviderPerformanceMetrics(businessId: string, providerId?: string) {
  try {
    let query = supabaseAdmin
      .from('provider_performance_view')
      .select('*')
      .eq('business_id', businessId);

    if (providerId) {
      query = query.eq('provider_id', providerId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching provider metrics:', error);
    return { success: false, error };
  }
}

/**
 * Get real-time provider availability for admin scheduling
 */
export async function getRealTimeProviderAvailability(businessId: string, date: string, time: string) {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('get_available_providers', {
        p_business_id: businessId,
        p_date: date,
        p_time: time
      });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching provider availability:', error);
    return { success: false, error };
  }
}

/**
 * Create admin notification for provider activity
 */
export async function createAdminNotification(businessId: string, type: string, data: any) {
  try {
    const { error } = await supabaseAdmin
      .from('admin_notifications')
      .insert({
        business_id: businessId,
        notification_type: type,
        title: data.title,
        message: data.message,
        metadata: data.metadata,
        read: false,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error creating admin notification:', error);
    return { success: false, error };
  }
}
