import { supabase, supabaseAdmin } from '@/lib/supabaseClient';

export interface Extra {
  id: string;
  business_id: string;
  industry_id: string;
  name: string;
  description?: string;
  icon?: string;
  time_minutes: number;
  service_category?: string;
  price: number;
  display: 'frontend-backend-admin' | 'backend-admin' | 'admin-only';
  qty_based: boolean;
  maximum_quantity?: number | null;
  exempt_from_discount: boolean;
  show_based_on_frequency: boolean;
  frequency_options?: string[];
  show_based_on_service_category: boolean;
  service_category_options?: string[];
  show_based_on_variables: boolean;
  variable_options?: string[];
  excluded_providers?: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateExtraData {
  business_id: string;
  industry_id: string;
  name: string;
  description?: string;
  icon?: string;
  time_minutes: number;
  service_category?: string;
  price: number;
  display: Extra['display'];
  qty_based: boolean;
  maximum_quantity?: number | null;
  exempt_from_discount: boolean;
  show_based_on_frequency?: boolean;
  frequency_options?: string[];
  show_based_on_service_category?: boolean;
  service_category_options?: string[];
  show_based_on_variables?: boolean;
  variable_options?: string[];
  excluded_providers?: string[];
  sort_order?: number;
}

export interface UpdateExtraData extends Partial<CreateExtraData> {}

class ExtrasService {
  private supabase;

  constructor() {
    // Use admin client for server-side operations, fall back to regular client
    this.supabase = (typeof window === 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;
  }

  async getExtrasByIndustry(industryId: string): Promise<Extra[]> {
    const { data, error } = await this.supabase
      .from('industry_extras')
      .select('*')
      .eq('industry_id', industryId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching extras:', error);
      throw error;
    }

    return data || [];
  }

  async getExtraById(id: string): Promise<Extra | null> {
    const { data, error } = await this.supabase
      .from('industry_extras')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching extra:', error);
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    return data;
  }

  async createExtra(extraData: CreateExtraData): Promise<Extra> {
    const { data, error } = await this.supabase
      .from('industry_extras')
      .insert(extraData)
      .select()
      .single();

    if (error) {
      console.error('Error creating extra:', error);
      throw error;
    }

    return data;
  }

  async updateExtra(id: string, updateData: UpdateExtraData): Promise<Extra> {
    const { data, error } = await this.supabase
      .from('industry_extras')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating extra:', error);
      throw error;
    }

    return data;
  }

  async deleteExtra(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('industry_extras')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting extra:', error);
      throw error;
    }
  }

  async permanentlyDeleteExtra(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('industry_extras')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error permanently deleting extra:', error);
      throw error;
    }
  }

  async updateExtraOrder(updates: Array<{ id: string; sort_order: number }>): Promise<void> {
    const promises = updates.map(({ id, sort_order }) =>
      this.supabase
        .from('industry_extras')
        .update({ sort_order })
        .eq('id', id)
    );

    const results = await Promise.all(promises);
    
    for (const result of results) {
      if (result.error) {
        console.error('Error updating extra order:', result.error);
        throw result.error;
      }
    }
  }

  // Migration helper: migrate from localStorage to database
  async migrateFromLocalStorage(industryId: string, industryName: string): Promise<void> {
    try {
      // Get data from localStorage
      const storageKey = `extras_${industryName}`;
      const stored = localStorage.getItem(storageKey);
      
      if (!stored || stored === "null") {
        console.log(`No extras found in localStorage for ${industryName}`);
        return;
      }

      const localStorageExtras = JSON.parse(stored);
      if (!Array.isArray(localStorageExtras) || localStorageExtras.length === 0) {
        console.log(`No valid extras array found in localStorage for ${industryName}`);
        return;
      }

      console.log(`Migrating ${localStorageExtras.length} extras from localStorage to database for ${industryName}`);

      // Get business_id from current session
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data: business } = await this.supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single();
      
      if (!business) throw new Error('Business not found');

      // Convert localStorage format to database format
      const dbExtras: CreateExtraData[] = localStorageExtras.map((extra, index) => ({
        business_id: business.id,
        industry_id: industryId,
        name: extra.name,
        description: extra.description,
        icon: extra.icon,
        time_minutes: extra.time || 0,
        service_category: extra.serviceCategory,
        price: extra.price || 0,
        display: extra.display || 'frontend-backend-admin',
        qty_based: extra.qtyBased || false,
        exempt_from_discount: extra.exemptFromDiscount || false,
        show_based_on_frequency: extra.showBasedOnFrequency || false,
        frequency_options: extra.frequencyOptions || [],
        show_based_on_service_category: extra.showBasedOnServiceCategory || false,
        service_category_options: extra.serviceCategoryOptions || [],
        show_based_on_variables: extra.showBasedOnVariables || false,
        variable_options: extra.variableOptions || [],
        sort_order: index
      }));

      // Insert all extras
      const { data, error } = await this.supabase
        .from('industry_extras')
        .insert(dbExtras)
        .select();

      if (error) {
        console.error('Error migrating extras:', error);
        throw error;
      }

      console.log(`Successfully migrated ${data?.length || 0} extras to database`);

      // Optionally clear localStorage after successful migration
      localStorage.removeItem(storageKey);
      console.log(`Cleared localStorage for ${industryName} extras`);

    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }
}

export const extrasService = new ExtrasService();
