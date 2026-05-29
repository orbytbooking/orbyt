import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_MASTER_TEMPLATE_BODY_HTML } from "@/lib/notificationMasterTemplate";

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
export const SEND_SCHEDULE_TEMPLATE_NAME = "Send Schedule";

export const DEFAULT_SEND_SCHEDULE_SUBJECT =
  "Your schedule: {{schedule_start}} – {{schedule_end}} — {{business_name}}";

function matchesTemplateName(name: string, target: string): boolean {
  return name.trim().toLowerCase() === target.trim().toLowerCase();
}

/**
 * Ensures an enabled "Send Schedule" template exists (creates or re-enables a default).
 */
export async function ensureSendScheduleNotificationTemplate(
  supabase: SupabaseClient,
  businessId: string,
): Promise<{ subject: string; body: string } | null> {
  const { data: rows, error } = await supabase
    .from("business_notification_templates")
    .select("id, name, subject, body, enabled")
    .eq("business_id", businessId);

  if (error) {
    console.error("[ensureSendScheduleNotificationTemplate]", error);
    return null;
  }

  const existing = (rows ?? []).find((r) =>
    matchesTemplateName(String((r as { name?: string }).name ?? ""), SEND_SCHEDULE_TEMPLATE_NAME),
  ) as { id: string; subject?: string; body?: string; enabled?: boolean } | undefined;

  const now = new Date().toISOString();
  const defaultBody = DEFAULT_MASTER_TEMPLATE_BODY_HTML;

  if (existing) {
    const needsEnable = existing.enabled === false;
    const needsBody = !String(existing.body ?? "").trim();
    const needsSubject = !String(existing.subject ?? "").trim();
    if (needsEnable || needsBody || needsSubject) {
      const { error: updateErr } = await supabase
        .from("business_notification_templates")
        .update({
          enabled: true,
          ...(needsBody ? { body: defaultBody } : {}),
          ...(needsSubject ? { subject: DEFAULT_SEND_SCHEDULE_SUBJECT } : {}),
          updated_at: now,
        })
        .eq("id", existing.id);
      if (updateErr) {
        console.error("[ensureSendScheduleNotificationTemplate] update:", updateErr);
        return null;
      }
    }
    return getBusinessNotificationTemplateByName(supabase, businessId, SEND_SCHEDULE_TEMPLATE_NAME);
  }

  const { error: insertErr } = await supabase.from("business_notification_templates").insert({
    business_id: businessId,
    name: SEND_SCHEDULE_TEMPLATE_NAME,
    subject: DEFAULT_SEND_SCHEDULE_SUBJECT,
    body: defaultBody,
    enabled: true,
    is_default: false,
    created_at: now,
    updated_at: now,
  });

  if (insertErr) {
    console.error("[ensureSendScheduleNotificationTemplate] insert:", insertErr);
    return null;
  }

  return getBusinessNotificationTemplateByName(supabase, businessId, SEND_SCHEDULE_TEMPLATE_NAME);
}

/** Enabled notification template matched by name (case-insensitive). */
export async function getBusinessNotificationTemplateByName(
  supabase: SupabaseClient,
  businessId: string,
  name: string,
): Promise<{ subject: string; body: string } | null> {
  const { data: rows } = await supabase
    .from("business_notification_templates")
    .select("name, subject, body, enabled")
    .eq("business_id", businessId)
    .eq("enabled", true);

  const target = name.trim().toLowerCase();
  const row = (rows ?? []).find((r) => String((r as { name?: string }).name ?? "").trim().toLowerCase() === target) as
    | { subject?: string; body?: string }
    | undefined;

  if (!row?.body?.trim()) return null;
  return { subject: row.subject ?? "", body: row.body };
}

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
