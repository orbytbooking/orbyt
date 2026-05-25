import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminGate } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin } = gate;
  const { data, error } = await admin
    .from("platform_announcements")
    .select("id, title, body, level, audience, is_active, starts_at, ends_at, created_at, updated_at, created_by")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcements: data ?? [] });
}

export async function POST(request: NextRequest) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin, user } = gate;
  const body = await request.json().catch(() => ({}));

  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  const level = String(body.level ?? "info").toLowerCase();
  const is_active = body.is_active === false ? false : true;
  const starts_at = body.starts_at ? String(body.starts_at) : null;
  const ends_at = body.ends_at ? String(body.ends_at) : null;

  const rawAudience = String(body.audience ?? "all").toLowerCase();
  const audience = ["all", "owners", "providers", "customers"].includes(rawAudience) ? rawAudience : "all";

  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!text) return NextResponse.json({ error: "body is required" }, { status: 400 });
  if (!["info", "warning", "maintenance", "success"].includes(level)) {
    return NextResponse.json({ error: "Invalid level" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("platform_announcements")
    .insert({
      title,
      body: text,
      level,
      audience,
      is_active,
      starts_at,
      ends_at,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ announcement: data }, { status: 201 });
}

