import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import { normalizeFrequencyPopupDisplay } from '@/lib/frequencyPopupDisplay';

export type PricingVariableDisplay =
  | 'customer_frontend_backend_admin'
  | 'customer_backend_admin'
  | 'admin_only';

const PRICING_VARIABLE_DISPLAYS: readonly PricingVariableDisplay[] = [
  'customer_frontend_backend_admin',
  'customer_backend_admin',
  'admin_only',
];

export function normalizePricingVariableDisplay(raw: string | undefined | null): PricingVariableDisplay {
  const t = String(raw ?? '').trim();
  return (PRICING_VARIABLE_DISPLAYS as readonly string[]).includes(t)
    ? (t as PricingVariableDisplay)
    : 'customer_frontend_backend_admin';
}

export interface PricingVariableRow {
  id: string;
  industry_id: string;
  business_id: string;
  name: string;
  category: string;
  description: string;
  is_active: boolean;
  /** Present after migration `112_pricing_variable_customer_end`. */
  different_on_customer_end?: boolean;
  customer_end_name?: string | null;
  /** After migration `113_pricing_variable_display_popup`. */
  show_explanation_icon_on_form?: boolean;
  explanation_tooltip_text?: string | null;
  enable_popup_on_selection?: boolean;
  popup_content?: string | null;
  popup_display?: string;
  display?: string;
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
  different_on_customer_end?: boolean;
  customer_end_name?: string | null;
  show_explanation_icon_on_form?: boolean;
  explanation_tooltip_text?: string | null;
  enable_popup_on_selection?: boolean;
  popup_content?: string | null;
  popup_display?: string;
  display?: string;
  sort_order?: number;
}

export interface UpdatePricingVariableData {
  name?: string;
  category?: string;
  description?: string;
  is_active?: boolean;
  different_on_customer_end?: boolean;
  customer_end_name?: string | null;
  show_explanation_icon_on_form?: boolean;
  explanation_tooltip_text?: string | null;
  enable_popup_on_selection?: boolean;
  popup_content?: string | null;
  popup_display?: string;
  display?: string;
  sort_order?: number;
}

/** Variable payload from frontend (id optional for new) */
export interface PricingVariablePayload {
  id?: string;
  name: string;
  category: string;
  description?: string;
  is_active: boolean;
  different_on_customer_end?: boolean;
  customer_end_name?: string | null;
  show_explanation_icon_on_form?: boolean;
  explanation_tooltip_text?: string | null;
  enable_popup_on_selection?: boolean;
  popup_content?: string | null;
  popup_display?: string;
  display?: string;
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
      const sharedFields = {
        name: v.name,
        category: v.category,
        description: v.description ?? '',
        is_active: v.is_active ?? true,
        different_on_customer_end: Boolean(v.different_on_customer_end),
        customer_end_name:
          v.different_on_customer_end && v.customer_end_name != null && String(v.customer_end_name).trim()
            ? String(v.customer_end_name).trim()
            : null,
        show_explanation_icon_on_form: Boolean(v.show_explanation_icon_on_form),
        explanation_tooltip_text:
          v.show_explanation_icon_on_form && v.explanation_tooltip_text != null && String(v.explanation_tooltip_text).trim()
            ? String(v.explanation_tooltip_text).trim()
            : null,
        enable_popup_on_selection: Boolean(v.enable_popup_on_selection),
        popup_content: v.enable_popup_on_selection ? (v.popup_content ?? '') : '',
        popup_display: normalizeFrequencyPopupDisplay(v.popup_display),
        display: normalizePricingVariableDisplay(v.display),
        sort_order: i,
      };
      if (v.id && existingIds.has(v.id)) {
        await this.update(v.id, sharedFields);
      } else {
        await this.create({
          industry_id: industryId,
          business_id: businessId,
          ...sharedFields,
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
