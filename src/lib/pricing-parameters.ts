import { supabase, supabaseAdmin } from '@/lib/supabaseClient';

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
}

export interface UpdatePricingParameterData extends Partial<CreatePricingParameterData> {}

class PricingParametersService {
  private supabase;

  constructor() {
    this.supabase = (typeof window === 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;
  }

  async getPricingParametersByIndustry(industryId: string): Promise<PricingParameter[]> {
    const { data, error } = await this.supabase
      .from('industry_pricing_parameter')
      .select('*')
      .eq('industry_id', industryId)
      .order('variable_category', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pricing parameters:', error);
      throw error;
    }

    return data || [];
  }

  async getPricingParameterById(id: string): Promise<PricingParameter | null> {
    const { data, error } = await this.supabase
      .from('industry_pricing_parameter')
      .select('*')
      .eq('id', id)
      .single();

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

  async deletePricingParameter(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('industry_pricing_parameter')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting pricing parameter:', error);
      throw error;
    }
  }

  async updatePricingParameterOrder(updates: Array<{ id: string; sort_order: number }>): Promise<void> {
    const promises = updates.map(({ id, sort_order }) =>
      this.supabase
        .from('industry_pricing_parameter')
        .update({ sort_order })
        .eq('id', id)
    );

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
