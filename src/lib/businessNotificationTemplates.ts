import type { SupabaseClient } from "@supabase/supabase-js";

/** Row shape for `business_notification_templates`. */
export type BusinessNotificationTemplate = {
  id: string;
  business_id: string;
  name: string;
  subject: string;
  body: string;
  enabled: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Load the enabled default master template for a business (for wrapping outbound HTML).
 * Returns null if none set or disabled.
 */
export async function getDefaultBusinessNotificationTemplate(
  supabase: SupabaseClient,
  businessId: string,
): Promise<{ subject: string; body: string } | null> {
  const { data } = await supabase
    .from("business_notification_templates")
    .select("subject, body, enabled, is_default")
    .eq("business_id", businessId)
    .eq("is_default", true)
    .eq("enabled", true)
    .maybeSingle();

  const row = data as { subject?: string; body?: string } | null;
  if (!row?.body?.trim()) return null;
  return { subject: row.subject ?? "", body: row.body };
}
