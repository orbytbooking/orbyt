import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import type { BookingFormScope } from '@/lib/bookingFormScope';

export interface PricingParameter {
  id: string;
  business_id: string;
  industry_id: string;
  name: string;
  description?: string;
  variable_category: string;
  price: number;
  time_minutes: number;
  display: 'Customer Frontend, Backend & Admin' | 'Customer Backend & Admin' | 'Admin Only';
  service_category?: string;
  service_category2?: string;
  frequency?: string;
  is_default: boolean;
  show_based_on_frequency: boolean;
  show_based_on_service_category: boolean;
  show_based_on_service_category2: boolean;
  excluded_extras?: string[];
  excluded_services?: string[];
  excluded_providers?: string[];
  exclude_parameters?: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
  booking_form_scope?: BookingFormScope;
  pricing_variable_id?: string | null;
  /** Form 2 merchant location (M.L.); null = same as service area until set. */
  price_merchant_location?: number | null;
  time_minutes_merchant_location?: number | null;
  quantity_based?: boolean;
  icon?: string | null;
}

export interface CreatePricingParameterData {
  business_id: string;
  industry_id: string;
  name: string;
  description?: string;
  variable_category: string;
  price: number;
  time_minutes: number;
  display: PricingParameter['display'];
  service_category?: string;
  service_category2?: string;
  frequency?: string;
  is_default?: boolean;
  show_based_on_frequency?: boolean;
  show_based_on_service_category?: boolean;
  show_based_on_service_category2?: boolean;
  excluded_extras?: string[];
  excluded_services?: string[];
  excluded_providers?: string[];
  exclude_parameters?: string[];
  sort_order?: number;
  booking_form_scope?: BookingFormScope;
  pricing_variable_id?: string | null;
  price_merchant_location?: number | null;
  time_minutes_merchant_location?: number | null;
  quantity_based?: boolean;
  icon?: string | null;
}

export interface UpdatePricingParameterData extends Partial<CreatePricingParameterData> {}

class PricingParametersService {
  private supabase;

  constructor() {
    this.supabase = (typeof window === 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;
  }

  async getPricingParametersByIndustry(
    industryId: string,
    businessId?: string | null,
    bookingFormScope?: BookingFormScope | null,
  ): Promise<PricingParameter[]> {
    let q = this.supabase
      .from('industry_pricing_parameter')
      .select('*')
      .eq('industry_id', industryId);
    if (businessId?.trim()) {
      q = q.eq('business_id', businessId.trim());
    }
    if (bookingFormScope === 'form1' || bookingFormScope === 'form2') {
      q = q.eq('booking_form_scope', bookingFormScope);
    }
    const { data, error } = await q
      .order('variable_category', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pricing parameters:', error);
      throw error;
    }

    return data || [];
  }

  async getPricingParameterById(
    id: string,
    scope?: { business_id: string; industry_id: string },
  ): Promise<PricingParameter | null> {
    let q = this.supabase.from('industry_pricing_parameter').select('*').eq('id', id);
    if (scope?.business_id?.trim()) {
      q = q.eq('business_id', scope.business_id.trim());
    }
    if (scope?.industry_id?.trim()) {
      q = q.eq('industry_id', scope.industry_id.trim());
    }
    const { data, error } = await q.single();

    if (error) {
      console.error('Error fetching pricing parameter:', error);
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  }

  async createPricingParameter(paramData: CreatePricingParameterData): Promise<PricingParameter> {
    const { data, error } = await this.supabase
      .from('industry_pricing_parameter')
      .insert(paramData)
      .select()
      .single();

    if (error) {
      console.error('Error creating pricing parameter:', error);
      throw error;
    }

    return data;
  }

  async updatePricingParameter(id: string, updateData: UpdatePricingParameterData): Promise<PricingParameter> {
    const { data, error } = await this.supabase
      .from('industry_pricing_parameter')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating pricing parameter:', error);
      throw error;
    }

    return data;
  }

  async deletePricingParameter(
    id: string,
    scope?: { business_id: string; industry_id: string },
  ): Promise<{ deleted: boolean }> {
    let q = this.supabase.from('industry_pricing_parameter').delete().eq('id', id);
    if (scope) {
      q = q.eq('business_id', scope.business_id).eq('industry_id', scope.industry_id);
    }
    const { data, error } = await q.select('id');

    if (error) {
      console.error('Error deleting pricing parameter:', error);
      throw error;
    }

    return { deleted: Array.isArray(data) && data.length > 0 };
  }

  async updatePricingParameterOrder(
    updates: Array<{ id: string; sort_order: number }>,
    scope?: { business_id: string; industry_id: string },
  ): Promise<void> {
    const promises = updates.map(({ id, sort_order }) => {
      let q = this.supabase
        .from('industry_pricing_parameter')
        .update({ sort_order })
        .eq('id', id);
      if (scope) {
        q = q.eq('business_id', scope.business_id).eq('industry_id', scope.industry_id);
      }
      return q;
    });

    const results = await Promise.all(promises);
    
    for (const result of results) {
      if (result.error) {
        console.error('Error updating pricing parameter order:', result.error);
        throw result.error;
      }
    }
  }
}

export const pricingParametersService = new PricingParametersService();
