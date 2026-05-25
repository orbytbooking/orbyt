import type { SupabaseClient, User } from "@supabase/supabase-js";

export function shortBookingRefForLogs(bookingId: string): string {
  return bookingId.replace(/-/g, "").slice(-6).toUpperCase();
}

export function getRequestClientIp(request: Request): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    null
  );
}

export {
  normalizeExpiryDateValue,
  formatExpiryDateForActivityLog,
  describeDraftQuoteExpiryChange,
} from "./draftQuoteExpiryUtils";

export function formatQuoteLogActorName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const given =
    typeof meta?.given_name === "string" ? meta.given_name.trim() : "";
  const family =
    typeof meta?.family_name === "string" ? meta.family_name.trim() : "";
  if (given && family) return `${given} ${family}`.trim();
  const full =
    (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta?.name === "string" && meta.name.trim()) ||
    "";
  if (full) return full;
  const email = user.email?.split("@")[0]?.trim();
  return email || "User";
}

export function describeDraftQuoteStatusChange(
  oldStatus: string | null | undefined,
  newStatus: string | null | undefined,
  bookingId: string,
  actorName: string
): string | null {
  if (!newStatus || oldStatus === newStatus) return null;
  const ref = shortBookingRefForLogs(bookingId);
  const prefix = `#${ref} -`;
  if (oldStatus === "draft" && newStatus === "quote") {
    return `${prefix} quote converted from draft by ${actorName}`;
  }
  if (oldStatus === "quote" && newStatus === "draft") {
    return `${prefix} quote reverted to draft by ${actorName}`;
  }
  if ((oldStatus === "draft" || oldStatus === "quote") && ["pending", "confirmed", "in_progress"].includes(newStatus)) {
    return `${prefix} booking submitted from ${oldStatus} by ${actorName}`;
  }
  if (oldStatus === "draft" && newStatus === "draft") return null;
  if (oldStatus === "quote" && newStatus === "quote") return null;
  return null;
}

export async function insertQuoteActivityLog(
  supabase: SupabaseClient,
  row: {
    business_id: string;
    booking_id: string;
    actor_user_id: string;
    actor_name: string;
    activity_text: string;
    event_key?: string;
    ip_address?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("booking_quote_activity_logs").insert({
    business_id: row.business_id,
    booking_id: row.booking_id,
    actor_user_id: row.actor_user_id,
    actor_name: row.actor_name,
    activity_text: row.activity_text,
    event_key: row.event_key ?? null,
    ip_address: row.ip_address ?? null,
  });
  if (error) {
    console.warn("booking_quote_activity_logs insert:", error.message);
    if (/relation|does not exist|42P01/i.test(String(error.message))) {
      console.warn(
        "Hint: run database/migrations/072_booking_quote_logs.sql on your Supabase project so quote history can be stored."
      );
    }
  }
}

export async function insertQuoteEmailLog(
  supabase: SupabaseClient,
  row: {
    business_id: string;
    booking_id: string;
    actor_user_id: string;
    to_email: string;
    subject: string;
    status: "sent" | "failed";
    error_message?: string | null;
    ip_address?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("booking_quote_email_logs").insert({
    business_id: row.business_id,
    booking_id: row.booking_id,
    actor_user_id: row.actor_user_id,
    to_email: row.to_email,
    subject: row.subject,
    status: row.status,
    error_message: row.error_message ?? null,
    ip_address: row.ip_address ?? null,
  });
  if (error) console.warn("booking_quote_email_logs insert:", error.message);
}

export async function logNewDraftOrQuote(
  supabase: SupabaseClient,
  request: Request,
  user: User,
  businessId: string,
  bookingId: string,
  status: string
): Promise<void> {
  if (status !== "draft" && status !== "quote") return;
  const actor = formatQuoteLogActorName(user);
  const ref = shortBookingRefForLogs(bookingId);
  const kind = status === "quote" ? "new quote created" : "new draft created";
  const text = `#${ref} - ${kind} by ${actor}`;
  await insertQuoteActivityLog(supabase, {
    business_id: businessId,
    booking_id: bookingId,
    actor_user_id: user.id,
    actor_name: actor,
    activity_text: text,
    event_key: kind.replace(/\s+/g, "_"),
    ip_address: getRequestClientIp(request),
  });
}
