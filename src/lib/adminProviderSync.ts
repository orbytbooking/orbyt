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
    // Get booking details
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('total_price, service_id')
      .eq('id', bookingId)
      .eq('provider_id', providerId)
      .eq('business_id', businessId)
      .single();

    if (bookingError || !booking) throw bookingError;

    // Get provider pay rate for this service
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

    // Calculate earnings
    let grossAmount = booking.total_price;
    let commissionAmount = 0;
    let netAmount = 0;

    if (payRate) {
      if (payRate.rate_type === 'percentage') {
        commissionAmount = (grossAmount * (payRate.percentage_rate || 0)) / 100;
        netAmount = grossAmount - commissionAmount;
      } else if (payRate.rate_type === 'flat') {
        netAmount = payRate.flat_rate || 0;
        commissionAmount = grossAmount - netAmount;
      } else if (payRate.rate_type === 'hourly') {
        // Would need duration info, for now use flat rate
        netAmount = payRate.hourly_rate || 0;
        commissionAmount = grossAmount - netAmount;
      }
    } else {
      // Default 80/20 split
      commissionAmount = grossAmount * 0.2;
      netAmount = grossAmount * 0.8;
    }

    // Record earnings
    const { error: earningsError } = await supabaseAdmin
      .from('provider_earnings')
      .insert({
        provider_id: providerId,
        business_id: businessId,
        booking_id: bookingId,
        service_id: booking.service_id,
        gross_amount: grossAmount,
        commission_rate: payRate?.rate_type || 'percentage',
        commission_amount: commissionAmount,
        net_amount: netAmount,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (earningsError) throw earningsError;

    return { success: true, earnings: { grossAmount, commissionAmount, netAmount } };
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
