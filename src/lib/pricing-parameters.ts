import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import type { BookingFormScope } from '@/lib/bookingFormScope';
import { hasBookingFormScopeColumnFilter } from '@/lib/bookingFormScope';
import { scopedIndustryTable } from '@/lib/formScopeTables';

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
  /** Form 4: unit label shown beside customer quantity (e.g. Square Feet). */
  unit_label?: string | null;
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
    const table = scopedIndustryTable('industry_pricing_parameter', bookingFormScope);
    let q = this.supabase
      .from(table)
      .select('*')
      .eq('industry_id', industryId);
    if (businessId?.trim()) {
      q = q.eq('business_id', businessId.trim());
    }
    // Dedicated form2/form4 tables are already scope-specific; only filter the shared Form 1 table.
    if (
      table === 'industry_pricing_parameter' &&
      hasBookingFormScopeColumnFilter(bookingFormScope)
    ) {
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
    scope?: { business_id: string; industry_id: string; booking_form_scope?: BookingFormScope | null },
  ): Promise<PricingParameter | null> {
    const preferredTable =
      scope?.booking_form_scope != null
        ? scopedIndustryTable('industry_pricing_parameter', scope.booking_form_scope)
        : null;
    const tables = Array.from(
      new Set(
        [
          preferredTable,
          'industry_pricing_parameter',
          'industry_form2_packages',
          'industry_form4_pricing_parameters',
        ].filter(Boolean) as string[],
      ),
    );

    for (const table of tables) {
      let q = this.supabase.from(table).select('*').eq('id', id);
      if (scope?.business_id?.trim()) {
        q = q.eq('business_id', scope.business_id.trim());
      }
      if (scope?.industry_id?.trim()) {
        q = q.eq('industry_id', scope.industry_id.trim());
      }
      // Scope column only disambiguates the shared Form 1 table; dedicated form2/form4 tables are already scoped by name.
      if (
        table === 'industry_pricing_parameter' &&
        hasBookingFormScopeColumnFilter(scope?.booking_form_scope)
      ) {
        q = q.eq('booking_form_scope', scope!.booking_form_scope!);
      }
      const res = await q.maybeSingle();
      if (res.error) {
        if (res.error.code !== 'PGRST116') {
          console.error(`Error fetching pricing parameter from ${table}:`, res.error);
        }
        continue;
      }
      if (res.data) return res.data;
    }

    return null;
  }

  async createPricingParameter(paramData: CreatePricingParameterData): Promise<PricingParameter> {
    const table = scopedIndustryTable('industry_pricing_parameter', paramData.booking_form_scope ?? 'form1');
    const { data, error } = await this.supabase
      .from(table)
      .insert(paramData)
      .select()
      .single();

    if (error) {
      console.error('Error creating pricing parameter:', error);
      throw error;
    }

    return data;
  }

  async updatePricingParameter(
    id: string,
    updateData: UpdatePricingParameterData,
    bookingFormScope?: BookingFormScope | null,
  ): Promise<PricingParameter> {
    const preferredTable = scopedIndustryTable('industry_pricing_parameter', bookingFormScope);
    const candidateTables = Array.from(
      new Set([preferredTable, 'industry_pricing_parameter', 'industry_form2_packages', 'industry_form4_pricing_parameters']),
    );

    let data: PricingParameter | null = null;
    let error: { code?: string; message?: string } | null = null;
    for (const table of candidateTables) {
      const res = await this.supabase
        .from(table)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (!res.error) {
        data = res.data;
        error = null;
        break;
      }
      error = res.error;
      if (res.error?.code !== 'PGRST116') break;
    }

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
    if (Array.isArray(data) && data.length > 0) return { deleted: true };
    const fallbackTables = ['industry_form2_packages', 'industry_form4_pricing_parameters'];
    for (const table of fallbackTables) {
      let q2 = this.supabase.from(table).delete().eq('id', id);
      if (scope) {
        q2 = q2.eq('business_id', scope.business_id).eq('industry_id', scope.industry_id);
      }
      const res = await q2.select('id');
      if (res.error) throw res.error;
      if (Array.isArray(res.data) && res.data.length > 0) return { deleted: true };
    }
    return { deleted: false };
  }

  async updatePricingParameterOrder(
    updates: Array<{ id: string; sort_order: number }>,
    scope?: { business_id: string; industry_id: string },
  ): Promise<void> {
    for (const { id, sort_order } of updates) {
      let q = this.supabase
        .from('industry_pricing_parameter')
        .update({ sort_order })
        .eq('id', id);
      if (scope) q = q.eq('business_id', scope.business_id).eq('industry_id', scope.industry_id);
      const res = await q.select('id');
      if (res.error) throw res.error;
      if ((res.data?.length ?? 0) > 0) continue;
      const fallbackTables = ['industry_form2_packages', 'industry_form4_pricing_parameters'];
      for (const table of fallbackTables) {
        let q2 = this.supabase
          .from(table)
          .update({ sort_order })
          .eq('id', id);
        if (scope) q2 = q2.eq('business_id', scope.business_id).eq('industry_id', scope.industry_id);
        const res2 = await q2.select('id');
        if (res2.error) throw res2.error;
        if ((res2.data?.length ?? 0) > 0) break;
      }
    }
  }
}

export const pricingParametersService = new PricingParametersService();
