import { supabase, supabaseAdmin } from '@/lib/supabaseClient';

export interface PricingVariableRow {
  id: string;
  industry_id: string;
  business_id: string;
  name: string;
  category: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePricingVariableData {
  industry_id: string;
  business_id: string;
  name: string;
  category: string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdatePricingVariableData {
  name?: string;
  category?: string;
  description?: string;
  is_active?: boolean;
  sort_order?: number;
}

/** Variable payload from frontend (id optional for new) */
export interface PricingVariablePayload {
  id?: string;
  name: string;
  category: string;
  description?: string;
  is_active: boolean;
}

class PricingVariablesService {
  private supabase;

  constructor() {
    this.supabase = (typeof window === 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;
  }

  async getByIndustry(industryId: string): Promise<PricingVariableRow[]> {
    const { data, error } = await this.supabase
      .from('industry_pricing_variable')
      .select('*')
      .eq('industry_id', industryId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching pricing variables:', error);
      throw error;
    }
    return data || [];
  }

  async create(payload: CreatePricingVariableData): Promise<PricingVariableRow> {
    const { data, error } = await this.supabase
      .from('industry_pricing_variable')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error creating pricing variable:', error);
      throw error;
    }
    return data;
  }

  async update(id: string, payload: UpdatePricingVariableData): Promise<PricingVariableRow> {
    const { data, error } = await this.supabase
      .from('industry_pricing_variable')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating pricing variable:', error);
      throw error;
    }
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('industry_pricing_variable')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting pricing variable:', error);
      throw error;
    }
  }

  /**
   * Replace all variables for an industry with the given list.
   * Creates new, updates existing (by id), deletes any in DB not in the list.
   */
  async saveBulk(
    industryId: string,
    businessId: string,
    variables: PricingVariablePayload[]
  ): Promise<PricingVariableRow[]> {
    const existing = await this.getByIndustry(industryId);
    const existingIds = new Set(existing.map((v) => v.id));
    const incomingIds = new Set(
      variables.filter((v) => v.id && existingIds.has(v.id)).map((v) => v.id as string)
    );

    for (let i = 0; i < variables.length; i++) {
      const v = variables[i];
      if (v.id && existingIds.has(v.id)) {
        await this.update(v.id, {
          name: v.name,
          category: v.category,
          description: v.description ?? '',
          is_active: v.is_active ?? true,
          sort_order: i,
        });
      } else {
        await this.create({
          industry_id: industryId,
          business_id: businessId,
          name: v.name,
          category: v.category,
          description: v.description ?? '',
          is_active: v.is_active ?? true,
          sort_order: i,
        });
      }
    }

    for (const id of existingIds) {
      if (!incomingIds.has(id)) {
        await this.delete(id);
      }
    }

    return this.getByIndustry(industryId);
  }
}

export const pricingVariablesService = new PricingVariablesService();
