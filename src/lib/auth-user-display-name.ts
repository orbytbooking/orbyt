import type { SupabaseClient, User } from "@supabase/supabase-js";

/** Human-readable name for the signed-in account (admin UI, activity logs). */
export function displayNameFromAuthUser(user: User | null | undefined): string {
  if (!user) return "Someone";

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fullName =
    typeof meta?.full_name === "string" && meta.full_name.trim() ? meta.full_name.trim() : "";
  if (fullName) return fullName;

  const metaName = typeof meta?.name === "string" && meta.name.trim() ? meta.name.trim() : "";
  if (metaName) return metaName;

  const email = user.email?.trim();
  if (email) {
    const local = email.split("@")[0] ?? "";
    if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  }

  return "Someone";
}

/** Prefer `profiles.full_name` (matches admin settings), then auth metadata / email. */
export async function resolveProspectActivityActorName(
  supabase: SupabaseClient,
  user: User
): Promise<string> {
  const { data, error } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  if (!error) {
    const fn = (data as { full_name?: string | null } | null)?.full_name?.trim();
    if (fn) return fn;
  }
  return displayNameFromAuthUser(user);
}
