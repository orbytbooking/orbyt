import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import type { BookingFormScope, IndustryExtraListingKind } from '@/lib/bookingFormScope';

/** Columns accepted on POST/PUT `/api/extras` — must match `industry_extras` (no `id` / timestamps). */
export const INDUSTRY_EXTRAS_WRITABLE_KEYS = [
  'business_id',
  'industry_id',
  'name',
  'description',
  'icon',
  'time_minutes',
  'service_category',
  'price',
  'display',
  'qty_based',
  'maximum_quantity',
  'pricing_structure',
  'manual_prices',
  'exempt_from_discount',
  'show_based_on_frequency',
  'frequency_options',
  'show_based_on_service_category',
  'service_category_options',
  'show_based_on_variables',
  'variable_options',
  'excluded_providers',
  'sort_order',
  'different_on_customer_end',
  'customer_end_name',
  'show_explanation_icon_on_form',
  'explanation_tooltip_text',
  'enable_popup_on_selection',
  'popup_content',
  'popup_display',
  'apply_to_all_bookings',
  'booking_form_scope',
  'listing_kind',
  'price_merchant_location',
  'time_minutes_merchant_location',
] as const;

/** Drop unknown keys so writes are DB-backed only (no arbitrary JSON → Supabase). */
export function pickIndustryExtraWritePayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const o = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of INDUSTRY_EXTRAS_WRITABLE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(o, key)) {
      out[key] = o[key];
    }
  }
  return out;
}

/**
 * Legacy Supabase projects may not have `manual_prices` / `pricing_structure` (migration 095) or
 * Form 1 popup columns (116). Omitting keys that match DB defaults lets PostgREST insert without
 * referencing missing columns. Only used for INSERT — updates still send full payloads when needed.
 */
export function pruneIndustryExtraRowForInsert(row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row };

  const ps = out.pricing_structure;
  const mp = out.manual_prices;
  const isMultiplyDefault =
    (ps === undefined || ps === null || ps === 'multiply') &&
    (mp === undefined ||
      mp === null ||
      (Array.isArray(mp) && mp.length === 0));
  if (isMultiplyDefault) {
    delete out.manual_prices;
    delete out.pricing_structure;
  }

  if (out.different_on_customer_end === false) {
    delete out.different_on_customer_end;
    delete out.customer_end_name;
  }
  if (out.show_explanation_icon_on_form === false) {
    delete out.show_explanation_icon_on_form;
    delete out.explanation_tooltip_text;
  }
  if (out.enable_popup_on_selection === false) {
    delete out.enable_popup_on_selection;
    delete out.popup_content;
    delete out.popup_display;
  }
  if (out.apply_to_all_bookings === true) {
    delete out.apply_to_all_bookings;
  }

  return out;
}

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
  /** Form 2 add-on: M.L. price; null = same as S.A. */
  price_merchant_location?: number | null;
  /** Form 2 add-on: M.L. duration; null = same as S.A. */
  time_minutes_merchant_location?: number | null;
  display: 'frontend-backend-admin' | 'backend-admin' | 'admin-only';
  qty_based: boolean;
  maximum_quantity?: number | null;
  pricing_structure?: 'multiply' | 'manual';
  manual_prices?: Array<{ price: number; time_minutes: number }>;
  exempt_from_discount: boolean;
  show_based_on_frequency: boolean;
  frequency_options?: string[];
  show_based_on_service_category: boolean;
  service_category_options?: string[];
  show_based_on_variables: boolean;
  variable_options?: string[];
  excluded_providers?: string[];
  different_on_customer_end?: boolean;
  customer_end_name?: string | null;
  show_explanation_icon_on_form?: boolean;
  explanation_tooltip_text?: string | null;
  enable_popup_on_selection?: boolean;
  popup_content?: string | null;
  popup_display?: string;
  apply_to_all_bookings?: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  booking_form_scope?: BookingFormScope;
  listing_kind?: IndustryExtraListingKind;
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
  price_merchant_location?: number | null;
  time_minutes_merchant_location?: number | null;
  display: Extra['display'];
  qty_based: boolean;
  maximum_quantity?: number | null;
  pricing_structure?: 'multiply' | 'manual';
  manual_prices?: Array<{ price: number; time_minutes: number }>;
  exempt_from_discount: boolean;
  show_based_on_frequency?: boolean;
  frequency_options?: string[];
  show_based_on_service_category?: boolean;
  service_category_options?: string[];
  show_based_on_variables?: boolean;
  variable_options?: string[];
  excluded_providers?: string[];
  different_on_customer_end?: boolean;
  customer_end_name?: string | null;
  show_explanation_icon_on_form?: boolean;
  explanation_tooltip_text?: string | null;
  enable_popup_on_selection?: boolean;
  popup_content?: string | null;
  popup_display?: string;
  apply_to_all_bookings?: boolean;
  sort_order?: number;
  booking_form_scope?: BookingFormScope;
  listing_kind?: IndustryExtraListingKind;
}

export interface UpdateExtraData extends Partial<CreateExtraData> {}

class ExtrasService {
  private supabase;

  constructor() {
    // Use admin client for server-side operations, fall back to regular client
    this.supabase = (typeof window === 'undefined' && supabaseAdmin) ? supabaseAdmin : supabase;
  }

  async getExtrasByIndustry(
    industryId: string,
    opts?: {
      businessId?: string | null;
      bookingFormScope?: BookingFormScope | null;
      listingKind?: IndustryExtraListingKind | null;
    },
  ): Promise<Extra[]> {
    let q = this.supabase
      .from('industry_extras')
      .select('*')
      .eq('industry_id', industryId);
    if (opts?.businessId?.trim()) {
      q = q.eq('business_id', opts.businessId.trim());
    }
    if (opts?.bookingFormScope === 'form1' || opts?.bookingFormScope === 'form2') {
      q = q.eq('booking_form_scope', opts.bookingFormScope);
    }
    if (opts?.listingKind === 'extra' || opts?.listingKind === 'addon') {
      q = q.eq('listing_kind', opts.listingKind);
    }
    const { data, error } = await q
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching extras:', error);
      throw error;
    }

    return data || [];
  }

  async getExtraById(
    id: string,
    scope?: { business_id: string; industry_id: string },
  ): Promise<Extra | null> {
    let q = this.supabase.from('industry_extras').select('*').eq('id', id);
    if (scope?.business_id?.trim()) {
      q = q.eq('business_id', scope.business_id.trim());
    }
    if (scope?.industry_id?.trim()) {
      q = q.eq('industry_id', scope.industry_id.trim());
    }
    const { data, error } = await q.single();

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
    const row = pruneIndustryExtraRowForInsert({ ...extraData } as Record<string, unknown>);
    const { data, error } = await this.supabase
      .from('industry_extras')
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error creating extra:', error);
      throw error;
    }

    return data;
  }

  async updateExtra(
    id: string,
    updateData: UpdateExtraData,
    scope?: { business_id: string; industry_id: string },
  ): Promise<Extra> {
    let q = this.supabase.from('industry_extras').update(updateData).eq('id', id);
    if (scope?.business_id?.trim()) {
      q = q.eq('business_id', scope.business_id.trim());
    }
    if (scope?.industry_id?.trim()) {
      q = q.eq('industry_id', scope.industry_id.trim());
    }
    const { data, error } = await q.select().single();

    if (error) {
      console.error('Error updating extra:', error);
      throw error;
    }

    return data;
  }

  async deleteExtra(
    id: string,
    scope?: { business_id: string; industry_id: string },
  ): Promise<{ deleted: boolean }> {
    let q = this.supabase.from('industry_extras').delete().eq('id', id);
    if (scope?.business_id?.trim()) {
      q = q.eq('business_id', scope.business_id.trim());
    }
    if (scope?.industry_id?.trim()) {
      q = q.eq('industry_id', scope.industry_id.trim());
    }
    const { data, error } = await q.select('id');

    if (error) {
      console.error('Error deleting extra:', error);
      throw error;
    }
    return { deleted: Array.isArray(data) && data.length > 0 };
  }

  async permanentlyDeleteExtra(
    id: string,
    scope?: { business_id: string; industry_id: string },
  ): Promise<{ deleted: boolean }> {
    let q = this.supabase.from('industry_extras').delete().eq('id', id);
    if (scope?.business_id?.trim()) {
      q = q.eq('business_id', scope.business_id.trim());
    }
    if (scope?.industry_id?.trim()) {
      q = q.eq('industry_id', scope.industry_id.trim());
    }
    const { data, error } = await q.select('id');

    if (error) {
      console.error('Error permanently deleting extra:', error);
      throw error;
    }
    return { deleted: Array.isArray(data) && data.length > 0 };
  }

  async updateExtraOrder(
    updates: Array<{ id: string; sort_order: number }>,
    scope?: { business_id: string; industry_id: string },
  ): Promise<void> {
    const promises = updates.map(({ id, sort_order }) =>
      {
        let q = this.supabase
          .from('industry_extras')
          .update({ sort_order })
          .eq('id', id);
        if (scope?.business_id?.trim()) {
          q = q.eq('business_id', scope.business_id.trim());
        }
        if (scope?.industry_id?.trim()) {
          q = q.eq('industry_id', scope.industry_id.trim());
        }
        return q;
      }
    );

    const results = await Promise.all(promises);
    
    for (const result of results) {
      if (result.error) {
        console.error('Error updating extra order:', result.error);
        throw result.error;
      }
    }
  }
}

export const extrasService = new ExtrasService();
