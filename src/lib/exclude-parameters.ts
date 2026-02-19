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
  excluded_providers?: string[];
  sort_order: number;
  qty_based?: boolean;
  maximum_quantity?: number | null;
  apply_to_all_bookings?: boolean;
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
  excluded_providers?: string[];
  sort_order?: number;
  qty_based?: boolean;
  maximum_quantity?: number | null;
  apply_to_all_bookings?: boolean;
}

export interface UpdateExcludeParameterData extends Partial<CreateExcludeParameterData> {}

class ExcludeParametersService {
  private supabase;

  constructor() {
    this.supabase = (typeof window === 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;
  }

  async getExcludeParametersByIndustry(industryId: string): Promise<ExcludeParameter[]> {
    console.log('🔍 EXCLUDE PARAMETERS SERVICE DEBUG');
    console.log('📥 industryId:', industryId);
    console.log('📥 industryId type:', typeof industryId);
    console.log('📥 industryId value:', JSON.stringify(industryId));
    console.log('🔍 Querying table: industry_exclude_parameter');
    
    const { data, error } = await this.supabase
      .from('industry_exclude_parameter')
      .select('*')
      .eq('industry_id', industryId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    console.log('📦 Database query result:');
    console.log('  - error:', error);
    console.log('  - data:', data);
    console.log('  - data type:', typeof data);
    console.log('  - data length:', data?.length || 0);

    if (error) {
      console.error('❌ Database error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', error.details);
      throw error;
    }

    if (data && data.length > 0) {
      console.log('✅ Successfully fetched exclude parameters:');
      data.forEach((param, index) => {
        console.log(`  ${index + 1}.`, param);
      });
    } else {
      console.log('❌ No exclude parameters found in database');
    }

    console.log('=== END EXCLUDE PARAMETERS SERVICE DEBUG ===');
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

  /** Columns that exist on industry_exclude_parameter */
  private static readonly TABLE_COLUMNS = [
    'business_id', 'industry_id', 'name', 'description', 'icon', 'price', 'time_minutes', 'display',
    'service_category', 'frequency', 'show_based_on_frequency', 'show_based_on_service_category',
    'excluded_providers', 'sort_order', 'show_based_on_variables', 'variables',
    'qty_based', 'maximum_quantity', 'apply_to_all_bookings'
  ] as const;

  private pickTableColumns<T extends Record<string, unknown>>(payload: T): Partial<Record<typeof ExcludeParametersService.TABLE_COLUMNS[number], unknown>> {
    const allowed = new Set(ExcludeParametersService.TABLE_COLUMNS);
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (allowed.has(key as typeof ExcludeParametersService.TABLE_COLUMNS[number]) && value !== undefined) {
        out[key] = value;
      }
    }
    return out;
  }

  async createExcludeParameter(paramData: CreateExcludeParameterData): Promise<ExcludeParameter> {
    const insertPayload = this.pickTableColumns(paramData as Record<string, unknown>);
    const { data, error } = await this.supabase
      .from('industry_exclude_parameter')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Error creating exclude parameter:', error);
      throw error;
    }

    return data;
  }

  async updateExcludeParameter(id: string, updateData: UpdateExcludeParameterData): Promise<ExcludeParameter> {
    const updatePayload = this.pickTableColumns(updateData as Record<string, unknown>);
    const { data, error } = await this.supabase
      .from('industry_exclude_parameter')
      .update(updatePayload)
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
