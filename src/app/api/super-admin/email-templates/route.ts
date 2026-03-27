import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminGate } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;
  const { admin } = gate;

  const { data, error } = await admin
    .from("platform_email_templates")
    .select("id, key, name, subject, body_text, body_html, is_active, created_at, updated_at")
    .order("key", { ascending: true })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(request: NextRequest) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;
  const { admin } = gate;

  const body = await request.json().catch(() => ({}));
  const key = String(body.key ?? "").trim();
  const name = String(body.name ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const body_text = String(body.body_text ?? "").trim();
  const body_html = String(body.body_html ?? "").trim();
  const is_active = body.is_active === false ? false : true;

  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const { data, error } = await admin
    .from("platform_email_templates")
    .insert({
      key,
      name,
      subject,
      body_text,
      body_html,
      is_active,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ template: data }, { status: 201 });
}

