import type { SupabaseClient } from "@supabase/supabase-js";
import { sendGiftCardEmail } from "@/lib/sendGiftCardEmail";
import { resolveBusinessBookNowUrl } from "@/lib/resolveBusinessBookNowUrl";

export type GiftCardInstanceEmailRow = {
  id: string;
  business_id: string;
  unique_code: string;
  original_amount: number | string;
  current_balance?: number | string | null;
  purchaser_email?: string | null;
  recipient_email?: string | null;
  recipient_name?: string | null;
  purchaser_name?: string | null;
  expires_at?: string | null;
  message?: string | null;
  email_image_url?: string | null;
  gift_card?: { name?: string; amount?: number | string } | null;
};

/** Send gift card notification email for an instance row (immediate, resend, or cron). */
export async function sendGiftCardInstanceEmail(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    instance: GiftCardInstanceEmailRow;
    requestOrigin?: string;
    imageUrl?: string | null;
  },
): Promise<{ sent: boolean; to: string | null; error?: string }> {
  const { businessId, instance } = params;
  const recipientEmail = String(instance.recipient_email ?? "").trim();
  if (!recipientEmail) {
    return { sent: false, to: null, error: "No recipient email" };
  }

  const giftCard = instance.gift_card;
  if (!giftCard?.name) {
    return { sent: false, to: recipientEmail, error: "Gift card template not found" };
  }

  const { data: businessRow } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", businessId)
    .maybeSingle();

  const businessName = String(businessRow?.name ?? "Your service provider").trim();
  const purchaserName =
    String(instance.purchaser_name ?? "").trim() ||
    (String(instance.purchaser_email ?? "").includes("@")
      ? String(instance.purchaser_email).split("@")[0]
      : "Someone special");
  const recipientName =
    String(instance.recipient_name ?? "").trim() ||
    recipientEmail.split("@")[0] ||
    "there";

  const sent = await sendGiftCardEmail({
    recipientEmail,
    recipientName,
    purchaserName,
    businessName,
    giftCardName: giftCard.name,
    amount: Number(instance.original_amount ?? giftCard.amount ?? 0),
    uniqueCode: String(instance.unique_code),
    expiresAt: String(instance.expires_at ?? ""),
    message: instance.message,
    bookNowUrl: resolveBusinessBookNowUrl(businessId, {
      giftCardCode: String(instance.unique_code),
      requestOrigin: params.requestOrigin,
    }),
    imageUrl: params.imageUrl ?? instance.email_image_url ?? null,
  });

  if (!sent) {
    return { sent: false, to: recipientEmail, error: "Email delivery failed" };
  }

  await supabase
    .from("gift_card_instances")
    .update({
      email_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", instance.id)
    .eq("business_id", businessId);

  return { sent: true, to: recipientEmail };
}

export async function restoreGiftCardRedemptionForBooking(
  supabase: SupabaseClient,
  businessId: string,
  bookingId: string,
  description?: string,
): Promise<{ ok: true; refundedCount: number; totalRefunded: number } | { ok: false; message: string }> {
  if (!businessId || !bookingId) {
    return { ok: false, message: "Business and booking are required." };
  }

  const { data, error } = await supabase.rpc("refund_gift_card_for_booking", {
    p_booking_id: bookingId,
    p_business_id: businessId,
    p_description: description ?? "Booking cancelled — gift card balance restored",
  });

  if (error) {
    console.error("refund_gift_card_for_booking RPC:", error);
    return { ok: false, message: error.message };
  }

  const row = data as { success?: boolean; refunded_count?: number; total_refunded?: number; error_message?: string } | null;
  if (row?.success === false) {
    return { ok: false, message: row.error_message || "Gift card restore failed." };
  }

  return {
    ok: true,
    refundedCount: Number(row?.refunded_count ?? 0),
    totalRefunded: Number(row?.total_refunded ?? 0),
  };
}
