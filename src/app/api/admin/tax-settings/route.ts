import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';

export type TaxMethod = 'taxify' | 'flat';

export interface TaxSettingsPayload {
  taxesEnabled?: boolean;
  method?: TaxMethod;
  taxLabel?: string;
  taxifyApiKey?: string | null;
  flatLocationMode?: 'single' | 'per_location';
  flatRateGlobal?: string; // percentage as string, e.g. "8.25"
  flatTaxAmountPerLocation?: Record<string, string>; // location_id -> percentage string
}

/**
 * Expected database table (create this in Supabase):
 *
 *   create table business_tax_settings (
 *     id uuid primary key default gen_random_uuid(),
 *     business_id uuid not null references businesses(id) on delete cascade,
 *     settings jsonb not null default '{}'::jsonb,
 *     created_at timestamptz not null default now(),
 *     updated_at timestamptz not null default now()
 *   );
 *   create unique index business_tax_settings_business_id_key on business_tax_settings(business_id);
 */

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      request.nextUrl.searchParams.get('businessId')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { data, error } = await supabase
      .from('business_tax_settings')
      .select('settings')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      console.error('Tax settings fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings: TaxSettingsPayload = (data?.settings as TaxSettingsPayload) || {};
    return NextResponse.json({ settings });
  } catch (e) {
    console.error('Tax settings GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const body = await request.json();
    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      (typeof body.businessId === 'string' ? body.businessId.trim() : '') ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const method: TaxMethod = body.method === 'flat' ? 'flat' : 'taxify';
    const flatLocationMode: 'single' | 'per_location' =
      body.flatLocationMode === 'per_location' ? 'per_location' : 'single';

    const normalizePercent = (value: unknown): string | undefined => {
      if (typeof value !== 'string' && typeof value !== 'number') return undefined;
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) return undefined;
      return n.toString();
    };

    const flatRateGlobal = normalizePercent(body.flatRateGlobal);
    const flatTaxAmountPerLocation: Record<string, string> | undefined =
      body.flatTaxAmountPerLocation && typeof body.flatTaxAmountPerLocation === 'object'
        ? Object.fromEntries(
            Object.entries(body.flatTaxAmountPerLocation)
              .filter(([k, v]) => k && normalizePercent(v) !== undefined)
              .map(([k, v]) => [k, normalizePercent(v)!]),
          )
        : undefined;

    const settings: TaxSettingsPayload = {
      taxesEnabled: !!body.taxesEnabled,
      method,
      taxLabel: typeof body.taxLabel === 'string' ? body.taxLabel : undefined,
      taxifyApiKey: typeof body.taxifyApiKey === 'string' ? body.taxifyApiKey : null,
      flatLocationMode,
      flatRateGlobal,
      flatTaxAmountPerLocation,
    };

    const { data: existing } = await supabase
      .from('business_tax_settings')
      .select('id')
      .eq('business_id', businessId)
      .maybeSingle();

    const payload = {
      settings,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from('business_tax_settings')
        .update(payload)
        .eq('business_id', businessId)
        .select('settings')
        .single();

      if (error) {
        console.error('Tax settings update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ settings: data.settings });
    }

    const { data, error } = await supabase
      .from('business_tax_settings')
      .insert({ business_id: businessId, ...payload })
      .select('settings')
      .single();

    if (error) {
      console.error('Tax settings insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ settings: data.settings });
  } catch (e) {
    console.error('Tax settings PUT:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

