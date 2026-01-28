import { supabase, supabaseAdmin } from '@/lib/supabaseClient';

export interface ExcludeParameter {
  id: string;
  business_id: string;
  industry_id: string;
  name: string;
  description?: string;
  icon?: string;
  price: number;
  time_minutes: number;
  display: 'Customer Frontend, Backend & Admin' | 'Customer Backend & Admin' | 'Admin Only';
  service_category?: string;
  frequency?: string;
  show_based_on_frequency: boolean;
  show_based_on_service_category: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateExcludeParameterData {
  business_id: string;
  industry_id: string;
  name: string;
  description?: string;
  icon?: string;
  price: number;
  time_minutes: number;
  display: ExcludeParameter['display'];
  service_category?: string;
  frequency?: string;
  show_based_on_frequency?: boolean;
  show_based_on_service_category?: boolean;
  sort_order?: number;
}

export interface UpdateExcludeParameterData extends Partial<CreateExcludeParameterData> {}

class ExcludeParametersService {
  private supabase;

  constructor() {
    this.supabase = (typeof window === 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;
  }

  async getExcludeParametersByIndustry(industryId: string): Promise<ExcludeParameter[]> {
    const { data, error } = await this.supabase
      .from('industry_exclude_parameter')
      .select('*')
      .eq('industry_id', industryId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching exclude parameters:', error);
      throw error;
    }

    return data || [];
  }

  async getExcludeParameterById(id: string): Promise<ExcludeParameter | null> {
    const { data, error } = await this.supabase
      .from('industry_exclude_parameter')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching exclude parameter:', error);
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  }

  async createExcludeParameter(paramData: CreateExcludeParameterData): Promise<ExcludeParameter> {
    const { data, error } = await this.supabase
      .from('industry_exclude_parameter')
      .insert(paramData)
      .select()
      .single();

    if (error) {
      console.error('Error creating exclude parameter:', error);
      throw error;
    }

    return data;
  }

  async updateExcludeParameter(id: string, updateData: UpdateExcludeParameterData): Promise<ExcludeParameter> {
    const { data, error } = await this.supabase
      .from('industry_exclude_parameter')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating exclude parameter:', error);
      throw error;
    }

    return data;
  }

  async deleteExcludeParameter(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('industry_exclude_parameter')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting exclude parameter:', error);
      throw error;
    }
  }

  async updateExcludeParameterOrder(updates: Array<{ id: string; sort_order: number }>): Promise<void> {
    const promises = updates.map(({ id, sort_order }) =>
      this.supabase
        .from('industry_exclude_parameter')
        .update({ sort_order })
        .eq('id', id)
    );

    const results = await Promise.all(promises);
    
    for (const result of results) {
      if (result.error) {
        console.error('Error updating exclude parameter order:', result.error);
        throw result.error;
      }
    }
  }
}

export const excludeParametersService = new ExcludeParametersService();
