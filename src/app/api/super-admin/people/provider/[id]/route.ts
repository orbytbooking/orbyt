import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminGate } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin } = gate;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const { data: provider, error } = await admin
      .from("service_providers")
      .select(
        "id, business_id, first_name, last_name, email, phone, address, specialization, rating, completed_jobs, status, provider_type, payout_method, total_earned, total_paid_out, current_balance, availability_status, profile_image_url, stripe_account_id, stripe_account_email, stripe_is_connected, stripe_connect_enabled, tags, access_blocked, created_at, updated_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

    const [{ data: business }, { count: bookingsCount }] = await Promise.all([
      admin.from("businesses").select("id, name, plan, is_active").eq("id", (provider as any).business_id).maybeSingle(),
      admin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", id),
    ]);

    return NextResponse.json({
      kind: "provider",
      person: {
        id: (provider as any).id,
        full_name: `${(provider as any).first_name ?? ""} ${(provider as any).last_name ?? ""}`.trim() || null,
        email: (provider as any).email ?? null,
        phone: (provider as any).phone ?? null,
        address: (provider as any).address ?? null,
        specialization: (provider as any).specialization ?? null,
        rating: (provider as any).rating ?? null,
        completed_jobs: (provider as any).completed_jobs ?? null,
        status: (provider as any).status ?? null,
        provider_type: (provider as any).provider_type ?? null,
        payout_method: (provider as any).payout_method ?? null,
        total_earned: (provider as any).total_earned ?? null,
        total_paid_out: (provider as any).total_paid_out ?? null,
        current_balance: (provider as any).current_balance ?? null,
        availability_status: (provider as any).availability_status ?? null,
        profile_image_url: (provider as any).profile_image_url ?? null,
        stripe_account_id: (provider as any).stripe_account_id ?? null,
        stripe_account_email: (provider as any).stripe_account_email ?? null,
        stripe_is_connected: Boolean((provider as any).stripe_is_connected),
        stripe_connect_enabled: Boolean((provider as any).stripe_connect_enabled),
        tags: (provider as any).tags ?? [],
        access_blocked: Boolean((provider as any).access_blocked),
        created_at: (provider as any).created_at ?? null,
        updated_at: (provider as any).updated_at ?? null,
      },
      business: business
        ? {
            id: (business as any).id,
            name: (business as any).name,
            plan: (business as any).plan,
            is_active: (business as any).is_active !== false,
          }
        : null,
      counts: {
        bookings: bookingsCount ?? 0,
      },
    });
  } catch (e) {
    console.error("[super-admin provider detail]", e);
    return NextResponse.json({ error: "Failed to load provider details" }, { status: 500 });
  }
}

