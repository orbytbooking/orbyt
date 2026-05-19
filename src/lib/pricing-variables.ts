import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import { normalizeFrequencyPopupDisplay } from '@/lib/frequencyPopupDisplay';
import type { BookingFormScope } from '@/lib/bookingFormScope';
import { hasBookingFormScopeColumnFilter } from '@/lib/bookingFormScope';
import { scopedIndustryTable } from '@/lib/formScopeTables';

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
  booking_form_scope?: BookingFormScope;
  /** After migration `126_industry_pricing_variable_dependencies`. */
  show_based_on_frequency?: boolean;
  frequency_options?: string[] | null;
  show_based_on_service_category?: boolean;
  service_category_options?: string[] | null;
  show_based_on_location?: boolean;
  location_options?: string[] | null;
  qty_based?: boolean;
  maximum_quantity?: number | null;
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
  booking_form_scope?: BookingFormScope;
  show_based_on_frequency?: boolean;
  frequency_options?: string[];
  show_based_on_service_category?: boolean;
  service_category_options?: string[];
  show_based_on_location?: boolean;
  location_options?: string[];
  qty_based?: boolean;
  maximum_quantity?: number | null;
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
  show_based_on_frequency?: boolean;
  frequency_options?: string[];
  show_based_on_service_category?: boolean;
  service_category_options?: string[];
  show_based_on_location?: boolean;
  location_options?: string[];
  qty_based?: boolean;
  maximum_quantity?: number | null;
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
  show_based_on_frequency?: boolean;
  frequency_options?: string[];
  show_based_on_service_category?: boolean;
  service_category_options?: string[];
  show_based_on_location?: boolean;
  location_options?: string[];
  qty_based?: boolean;
  maximum_quantity?: number | null;
}

class PricingVariablesService {
  private supabase;

  constructor() {
    this.supabase = (typeof window === 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;
  }

  private sanitizeForScope<T extends Record<string, unknown>>(
    payload: T,
    bookingFormScope: BookingFormScope,
  ): T {
    if (bookingFormScope === 'form3') {
      return payload;
    }
    const next = { ...payload };
    delete next.show_based_on_location;
    delete next.location_options;
    delete next.qty_based;
    delete next.maximum_quantity;
    return next;
  }

  async getByIndustry(
    industryId: string,
    bookingFormScope: BookingFormScope | null = null,
    businessId?: string | null,
  ): Promise<PricingVariableRow[]> {
    const table = scopedIndustryTable('industry_pricing_variable', bookingFormScope);
    let q = this.supabase
      .from(table)
      .select('*')
      .eq('industry_id', industryId);
    if (businessId?.trim()) {
      q = q.eq('business_id', businessId.trim());
    }
    if (hasBookingFormScopeColumnFilter(bookingFormScope)) {
      q = q.eq('booking_form_scope', bookingFormScope);
    }
    const { data, error } = await q
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching pricing variables:', error);
      throw error;
    }

    let rows = data || [];
    // Legacy rows may still live on industry_pricing_variable before migration 146 backfill.
    if (bookingFormScope === 'form3' && rows.length === 0) {
      let legacyQ = this.supabase
        .from('industry_pricing_variable')
        .select('*')
        .eq('industry_id', industryId)
        .eq('booking_form_scope', 'form3');
      if (businessId?.trim()) {
        legacyQ = legacyQ.eq('business_id', businessId.trim());
      }
      const { data: legacy, error: legacyErr } = await legacyQ
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (!legacyErr && legacy?.length) {
        rows = legacy;
      }
    }

    return rows;
  }

  async create(payload: CreatePricingVariableData): Promise<PricingVariableRow> {
    const table = scopedIndustryTable('industry_pricing_variable', payload.booking_form_scope ?? 'form1');
    const sanitized = this.sanitizeForScope(payload, payload.booking_form_scope ?? 'form1');
    const { data, error } = await this.supabase
      .from(table)
      .insert(sanitized)
      .select()
      .single();

    if (error) {
      console.error('Error creating pricing variable:', error);
      throw error;
    }
    return data;
  }

  private async scopedTableForRow(
    id: string,
    bookingFormScope: BookingFormScope,
  ): Promise<string> {
    const table = scopedIndustryTable('industry_pricing_variable', bookingFormScope);
    const { data, error } = await this.supabase.from(table).select('id').eq('id', id).maybeSingle();
    if (error) {
      console.error('Error resolving pricing variable table:', error);
      throw error;
    }
    if (data?.id) return table;
    if (bookingFormScope === 'form3') {
      const { data: legacy, error: legacyErr } = await this.supabase
        .from('industry_pricing_variable')
        .select('id')
        .eq('id', id)
        .eq('booking_form_scope', 'form3')
        .maybeSingle();
      if (legacyErr) {
        console.error('Error resolving legacy Form 3 item:', legacyErr);
        throw legacyErr;
      }
      if (legacy?.id) return 'industry_pricing_variable';
    }
    return table;
  }

  async update(id: string, payload: UpdatePricingVariableData, bookingFormScope: BookingFormScope = 'form1'): Promise<PricingVariableRow> {
    const table = await this.scopedTableForRow(id, bookingFormScope);
    const sanitized = this.sanitizeForScope(payload, bookingFormScope);
    const { data, error } = await this.supabase
      .from(table)
      .update({ ...sanitized, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating pricing variable:', error);
      throw error;
    }
    return data;
  }

  async delete(id: string, bookingFormScope: BookingFormScope = 'form1'): Promise<void> {
    const table = await this.scopedTableForRow(id, bookingFormScope);
    const { error } = await this.supabase.from(table).delete().eq('id', id);

    if (error) {
      console.error('Error deleting pricing variable:', error);
      throw error;
    }

    if (bookingFormScope === 'form3' && table === 'industry_form3_items') {
      await this.supabase
        .from('industry_pricing_variable')
        .delete()
        .eq('id', id)
        .eq('booking_form_scope', 'form3');
    }
  }

  /**
   * Replace all variables for an industry with the given list.
   * Creates new, updates existing (by id), deletes any in DB not in the list.
   */
  async saveBulk(
    industryId: string,
    businessId: string,
    variables: PricingVariablePayload[],
    bookingFormScope: BookingFormScope = 'form1',
  ): Promise<PricingVariableRow[]> {
    const existing = await this.getByIndustry(industryId, bookingFormScope, businessId);
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
        show_based_on_frequency: Boolean(v.show_based_on_frequency),
        frequency_options:
          v.show_based_on_frequency && Array.isArray(v.frequency_options)
            ? v.frequency_options.map((x) => String(x).trim()).filter(Boolean)
            : [],
        show_based_on_service_category: Boolean(v.show_based_on_service_category),
        service_category_options:
          v.show_based_on_service_category && Array.isArray(v.service_category_options)
            ? v.service_category_options.map((x) => String(x).trim()).filter(Boolean)
            : [],
        ...(bookingFormScope === 'form3'
          ? {
              show_based_on_location: Boolean(v.show_based_on_location),
              location_options:
                v.show_based_on_location && Array.isArray(v.location_options)
                  ? v.location_options.map((x) => String(x).trim()).filter(Boolean)
                  : [],
              qty_based: Boolean(v.qty_based),
              maximum_quantity:
                v.qty_based && v.maximum_quantity != null && !Number.isNaN(Number(v.maximum_quantity))
                  ? Number(v.maximum_quantity)
                  : null,
            }
          : {}),
      };
      const scopedFields = this.sanitizeForScope(sharedFields, bookingFormScope);
      if (v.id && existingIds.has(v.id)) {
        await this.update(v.id, scopedFields, bookingFormScope);
      } else {
        await this.create({
          industry_id: industryId,
          business_id: businessId,
          booking_form_scope: bookingFormScope,
          ...scopedFields,
        });
      }
    }

    for (const id of existingIds) {
      if (!incomingIds.has(id)) {
        await this.delete(id, bookingFormScope);
      }
    }

    return this.getByIndustry(industryId, bookingFormScope, businessId);
  }
}

export const pricingVariablesService = new PricingVariablesService();
