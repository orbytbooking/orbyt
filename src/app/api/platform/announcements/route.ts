import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const AUDIENCES = ["all", "owners", "providers", "customers"] as const;
type Audience = (typeof AUDIENCES)[number];

function viewerKind(user: { user_metadata?: Record<string, unknown> } | null): "anonymous" | Exclude<Audience, "all"> {
  if (!user) return "anonymous";
  const role = String(user.user_metadata?.role ?? "owner").toLowerCase();
  if (role === "customer") return "customers";
  if (role === "provider") return "providers";
  return "owners";
}

function announcementVisibleToViewer(rowAudience: string | null | undefined, viewer: "anonymous" | Exclude<Audience, "all">): boolean {
  const a = (rowAudience && AUDIENCES.includes(rowAudience as Audience) ? rowAudience : "all") as Audience;
  if (a === "all") return true;
  if (viewer === "anonymous") return false;
  return a === viewer;
}

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const user = await getAuthenticatedUser();
    const viewer = viewerKind(user);

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("platform_announcements")
      .select("id, title, body, level, audience, starts_at, ends_at, created_at")
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const filtered = (data ?? []).filter((row) =>
      announcementVisibleToViewer((row as { audience?: string }).audience, viewer)
    );

    return NextResponse.json({ announcements: filtered.slice(0, 50) });
  } catch {
    return NextResponse.json({ error: "Failed to load announcements" }, { status: 500 });
  }
}

