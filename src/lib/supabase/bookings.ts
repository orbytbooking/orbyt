import { supabase } from '../supabaseClient';

// Types matching the existing database table structure
export interface Booking {
  id: string;
  provider_id?: string;
  service_id?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date?: string;
  scheduled_time?: string;
  address: string;
  apt_no?: string;
  zip_code?: string;
  notes?: string;
  total_price: number;
  payment_method?: 'cash' | 'online';
  payment_status?: 'pending' | 'paid' | 'refunded';
  tip_amount?: number;
  tip_updated_at?: string;
  created_at?: string;
  updated_at?: string;
  amount?: number;
  business_id: string;
  customer_email?: string;
  customer_name?: string;
  customer_phone?: string;
  service?: string;
  date?: string;
  time?: string;
  customer_id?: string;
  provider_wage?: number;
  provider_wage_type?: 'percentage' | 'fixed' | 'hourly';
}

export interface BookingInsert {
  business_id: string;
  service?: string;
  service_id?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date?: string;
  scheduled_time?: string;
  address: string;
  apt_no?: string;
  zip_code?: string;
  notes?: string;
  total_price: number;
  payment_method?: 'cash' | 'online';
  payment_status?: 'pending' | 'paid' | 'refunded';
  tip_amount?: number;
  tip_updated_at?: string;
  customer_email?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_id?: string;
  provider_id?: string;
  provider_wage?: number;
  provider_wage_type?: 'percentage' | 'fixed' | 'hourly';
}

export interface BookingUpdate {
  status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  total_price?: number;
  tip_amount?: number;
  tip_updated_at?: string;
  payment_method?: 'cash' | 'online';
  payment_status?: 'pending' | 'paid' | 'refunded';
}

export interface ServiceCustomization {
  frequency?: string;
  squareMeters?: string;
  bedroom?: string;
  bathroom?: string;
  extras?: { name: string; quantity: number }[];
  isPartialCleaning?: boolean;
  excludedAreas?: string[];
  variableCategories?: { [categoryName: string]: string };
}

export interface BookingData {
  id?: string;
  service: string;
  serviceName: string;
  provider?: string;
  providerName?: string;
  frequency: string;
  date: string; // yyyy-mm-dd format
  time: string;
  status: 'scheduled' | 'completed' | 'canceled';
  address: string;
  contact: string;
  notes: string;
  price: number;
  tipAmount?: number;
  tipUpdatedAt?: string;
  customization?: ServiceCustomization;
}

/**
 * Create a new booking in the database
 */
export async function createBooking(
  bookingData: BookingData,
  customerId: string,
  businessId: string
): Promise<{ data: Booking | null; error: any }> {
  try {
    // Convert extras array to string format for storage (stored in notes for now)
    const formatExtrasForStorage = (extras: { name: string; quantity: number }[] | undefined): string => {
      if (!extras || extras.length === 0) return '';
      return extras.map(extra => 
        extra.quantity > 1 ? `${extra.name} (${extra.quantity})` : extra.name
      ).join(', ');
    };

    const bookingInsert: BookingInsert = {
      business_id: businessId,
      service: bookingData.serviceName,
      service_id: undefined, // UUID field, leave undefined for now
      status: 'pending', // Default status matching TypeScript interface
      scheduled_date: bookingData.date,
      scheduled_time: bookingData.time,
      address: bookingData.address,
      notes: bookingData.notes || '',
      total_price: bookingData.price,
      tip_amount: bookingData.tipAmount,
      tip_updated_at: bookingData.tipUpdatedAt ? new Date(bookingData.tipUpdatedAt).toISOString() : undefined,
      customer_email: customerId,
      customer_phone: bookingData.contact,
      customer_id: undefined, // UUID field, leave undefined for non-authenticated users
      provider_id: undefined,
    };

    const { data, error } = await supabase
      .from('bookings')
      .insert(bookingInsert)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error creating booking:', error);
    return { data: null, error };
  }
}

/**
 * Get bookings for a specific customer
 */
export async function getCustomerBookings(
  customerId: string,
  businessId?: string
): Promise<{ data: Booking[] | null; error: any }> {
  try {
    let query = supabase
      .from('bookings')
      .select('*')
      .eq('customer_id', customerId);

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    query = query.order('date', { ascending: false });

    const { data, error } = await query;

    return { data, error };
  } catch (error) {
    console.error('Error getting customer bookings:', error);
    return { data: null, error };
  }
}

/**
 * Get bookings for a specific business
 */
export async function getBusinessBookings(
  businessId: string
): Promise<{ data: Booking[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('business_id', businessId)
      .order('date', { ascending: false });

    return { data, error };
  } catch (error) {
    console.error('Error getting business bookings:', error);
    return { data: null, error };
  }
}

/**
 * Update a booking
 */
export async function updateBooking(
  bookingId: string,
  updates: Partial<BookingData>
): Promise<{ data: Booking | null; error: any }> {
  try {
    const bookingUpdate: BookingUpdate = {};

    if (updates.status) {
      // Map status values to match existing table
      const statusMap: Record<string, 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'> = {
        'scheduled': 'pending',
        'completed': 'completed',
        'canceled': 'cancelled'
      };
      bookingUpdate.status = statusMap[updates.status] || 'pending';
    }
    if (updates.notes !== undefined) bookingUpdate.notes = updates.notes;
    if (updates.price !== undefined) bookingUpdate.total_price = updates.price;
    if (updates.tipAmount !== undefined) bookingUpdate.tip_amount = updates.tipAmount;
    if (updates.tipUpdatedAt) bookingUpdate.tip_updated_at = new Date(updates.tipUpdatedAt).toISOString();
    if (updates.customization) {
      // Store customization in notes field since there's no customization column
      const formatExtrasForStorage = (extras: { name: string; quantity: number }[] | undefined): string => {
        if (!extras || extras.length === 0) return '';
        return extras.map(extra => 
          extra.quantity > 1 ? `${extra.name} (${extra.quantity})` : extra.name
        ).join(', ');
      };

      const customizationText = JSON.stringify(updates.customization);
      bookingUpdate.notes = updates.notes 
        ? `${updates.notes}\n\nCustomization: ${customizationText}`
        : `Customization: ${customizationText}`;
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(bookingUpdate)
      .eq('id', bookingId)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error updating booking:', error);
    return { data: null, error };
  }
}

/**
 * Delete a booking
 */
export async function deleteBooking(
  bookingId: string
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    return { error };
  } catch (error) {
    console.error('Error deleting booking:', error);
    return { error };
  }
}

/**
 * Get a specific booking by ID
 */
export async function getBookingById(
  bookingId: string
): Promise<{ data: Booking | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error getting booking by ID:', error);
    return { data: null, error };
  }
}
