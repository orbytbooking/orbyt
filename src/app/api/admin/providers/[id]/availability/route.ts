import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
if (!supabaseServiceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

type AvailabilityItemInput = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  effective_date?: string | null;
  expiry_date?: string | null;
  is_available?: boolean;
};

function normalizeTime(t: string) {
  return t.length === 5 ? `${t}:00` : t;
}

async function assertProviderInBusiness(supabaseAdmin: any, providerId: string, businessId: string) {
  const { data: provider, error } = await supabaseAdmin
    .from("service_providers")
    .select("id, business_id")
    .eq("id", providerId)
    .single();

  if (error || !provider) {
    return { ok: false as const, status: 404, error: "Provider not found" };
  }
  if (provider.business_id !== businessId) {
    return { ok: false as const, status: 403, error: "Provider does not belong to this business" };
  }
  return { ok: true as const };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: providerId } = await params;
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId") || request.headers.get("x-business-id");

    if (!providerId) return NextResponse.json({ error: "Provider ID is required" }, { status: 400 });
    if (!businessId) return NextResponse.json({ error: "Business ID is required" }, { status: 400 });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const check = await assertProviderInBusiness(supabaseAdmin, providerId, businessId);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const { data: availability, error } = await supabaseAdmin
      .from("provider_availability")
      .select("*")
      .eq("provider_id", providerId)
      .eq("business_id", businessId)
      .order("effective_date", { ascending: true })
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, availability: availability || [] });
  } catch (e: any) {
    console.error("Admin provider availability GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: providerId } = await params;
    const body = await request.json().catch(() => ({}));
    const businessId = body?.businessId || request.headers.get("x-business-id");
    const items: AvailabilityItemInput[] = Array.isArray(body?.items) ? body.items : body?.item ? [body.item] : [];

    if (!providerId) return NextResponse.json({ error: "Provider ID is required" }, { status: 400 });
    if (!businessId) return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
    if (!items.length) return NextResponse.json({ error: "items is required" }, { status: 400 });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const check = await assertProviderInBusiness(supabaseAdmin, providerId, businessId);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const payload = items.map((it) => {
      const effective = it.effective_date ?? null;
      const expiry =
        it.expiry_date !== undefined
          ? it.expiry_date
          : effective
            ? effective
            : null;
      return {
      provider_id: providerId,
      business_id: businessId,
      day_of_week: it.day_of_week,
      start_time: normalizeTime(it.start_time),
      end_time: normalizeTime(it.end_time),
      is_available: it.is_available ?? true,
      effective_date: effective,
      // Safety: if effective_date is provided but expiry_date isn't, default to same date (single-date slot)
      expiry_date: expiry,
      updated_at: new Date().toISOString(),
      };
    });

    const { data, error } = await supabaseAdmin.from("provider_availability").insert(payload).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    console.error("Admin provider availability POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: providerId } = await params;
    const body = await request.json().catch(() => ({}));
    const businessId = body?.businessId || request.headers.get("x-business-id");
    const availabilityId = body?.availabilityId;
    const patch: Partial<AvailabilityItemInput> = body?.patch || {};

    if (!providerId) return NextResponse.json({ error: "Provider ID is required" }, { status: 400 });
    if (!businessId) return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
    if (!availabilityId) return NextResponse.json({ error: "availabilityId is required" }, { status: 400 });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const check = await assertProviderInBusiness(supabaseAdmin, providerId, businessId);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (patch.day_of_week !== undefined) updatePayload.day_of_week = patch.day_of_week;
    if (patch.start_time !== undefined) updatePayload.start_time = normalizeTime(patch.start_time);
    if (patch.end_time !== undefined) updatePayload.end_time = normalizeTime(patch.end_time);
    if (patch.is_available !== undefined) updatePayload.is_available = patch.is_available;
    if (patch.effective_date !== undefined) updatePayload.effective_date = patch.effective_date;
    if (patch.expiry_date !== undefined) updatePayload.expiry_date = patch.expiry_date;
    // Safety: if effective_date is being set but expiry_date isn't provided, default expiry_date = effective_date
    if (
      patch.effective_date !== undefined &&
      patch.effective_date &&
      patch.expiry_date === undefined
    ) {
      updatePayload.expiry_date = patch.effective_date;
    }

    const { data, error } = await supabaseAdmin
      .from("provider_availability")
      .update(updatePayload)
      .eq("id", availabilityId)
      .eq("provider_id", providerId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    console.error("Admin provider availability PUT error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: providerId } = await params;
    const body = await request.json().catch(() => ({}));
    const businessId = body?.businessId || request.headers.get("x-business-id");
    const availabilityId = body?.availabilityId;

    if (!providerId) return NextResponse.json({ error: "Provider ID is required" }, { status: 400 });
    if (!businessId) return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
    if (!availabilityId) return NextResponse.json({ error: "availabilityId is required" }, { status: 400 });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const check = await assertProviderInBusiness(supabaseAdmin, providerId, businessId);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

    const { error } = await supabaseAdmin
      .from("provider_availability")
      .delete()
      .eq("id", availabilityId)
      .eq("provider_id", providerId)
      .eq("business_id", businessId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Admin provider availability DELETE error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

