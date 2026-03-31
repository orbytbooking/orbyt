import type { SupabaseClient } from "@supabase/supabase-js";

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
