import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type AdminModuleKey,
  effectiveModuleAllowed,
} from "@/lib/adminModulePermissions";

export async function getTenantModuleAccessState(
  supabase: SupabaseClient,
  userId: string,
  businessId: string
): Promise<{
  isOwner: boolean;
  permissions: Record<string, boolean> | null;
}> {
  const { data: owned } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (owned) return { isOwner: true, permissions: null };

  const { data: tu } = await supabase
    .from("tenant_users")
    .select("permissions")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  const raw = tu?.permissions;
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { isOwner: false, permissions: null };
  }
  return { isOwner: false, permissions: raw as Record<string, boolean> };
}

export async function tenantMayAccessModule(
  supabase: SupabaseClient,
  userId: string,
  businessId: string,
  moduleKey: AdminModuleKey
): Promise<boolean> {
  const { isOwner, permissions } = await getTenantModuleAccessState(
    supabase,
    userId,
    businessId
  );
  return effectiveModuleAllowed(isOwner, permissions, moduleKey);
}
