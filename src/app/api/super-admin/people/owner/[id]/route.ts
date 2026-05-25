import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminGate } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin, user } = gate;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const [{ data: profile }, { data: businesses }, authRes] = await Promise.all([
      admin.from("profiles").select("id, full_name, phone, business_id, created_at").eq("id", id).maybeSingle(),
      admin
        .from("businesses")
        .select("id, name, plan, is_active, created_at")
        .eq("owner_id", id)
        .order("created_at", { ascending: false }),
      (admin as any).auth?.admin?.getUserById?.(id).catch(() => null),
    ]);

    const authUser = authRes?.data?.user ?? null;
    const email = authUser?.email ?? null;

    return NextResponse.json({
      kind: "owner",
      person: {
        id,
        full_name: (profile as any)?.full_name ?? null,
        email,
        phone: (profile as any)?.phone ?? null,
        created_at: (profile as any)?.created_at ?? authUser?.created_at ?? null,
      },
      businesses: (businesses ?? []).map((b: any) => ({
        id: b.id,
        name: b.name,
        plan: b.plan,
        is_active: b.is_active !== false,
        created_at: b.created_at,
      })),
    });
  } catch (e) {
    console.error("[super-admin owner detail]", e);
    return NextResponse.json({ error: "Failed to load owner details" }, { status: 500 });
  }
}

