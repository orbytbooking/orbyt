import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  effectiveModuleAllowed,
  type AdminModuleKey,
} from "@/lib/adminModulePermissions";

function getServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Server-only: authorize CRM user for a tenant + sidebar module (uses service role for membership lookup). */
export async function assertUserHasAdminModuleAccess(
  userId: string,
  businessId: string,
  moduleKey: AdminModuleKey
): Promise<"ok" | "no_service_role" | "denied"> {
  const svc = getServiceRoleClient();
  if (!svc) return "no_service_role";
  const ok = await userCanAccessAdminModuleForBusiness(svc, userId, businessId, moduleKey);
  return ok ? "ok" : "denied";
}

/** Owner or active tenant_users (same bar as booking list APIs). */
export async function assertUserCanManageBusinessTenant(
  userId: string,
  businessId: string
): Promise<"ok" | "no_service_role" | "denied"> {
  const svc = getServiceRoleClient();
  if (!svc) return "no_service_role";
  const ok = await userCanManageBookingsForBusiness(svc, userId, businessId);
  return ok ? "ok" : "denied";
}

/** Owner or active tenant_users row for this business (matches list-bookings access). */
export async function userCanManageBookingsForBusiness(
  supabase: SupabaseClient,
  userId: string,
  businessId: string
): Promise<boolean> {
  const { data: owned } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (owned) return true;

  const { data: tenant } = await supabase
    .from("tenant_users")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  return !!tenant;
}

/**
 * Owner: full CRM access. Staff: must have an active tenant_users row and the given module allowed * (null permissions = all modules; explicit false denies).
 */
export async function userCanAccessAdminModuleForBusiness(
  supabase: SupabaseClient,
  userId: string,
  businessId: string,
  moduleKey: AdminModuleKey
): Promise<boolean> {
  const { data: owned } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (owned) return true;

  const { data: tenant } = await supabase
    .from("tenant_users")
    .select("permissions")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (!tenant) return false;
  return effectiveModuleAllowed(
    false,
    tenant.permissions as Record<string, boolean> | null,
    moduleKey
  );
}
