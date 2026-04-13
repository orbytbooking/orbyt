import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { EmailService } from "@/lib/emailService";
import { fetchMerchantTransactionCardSnapshot } from "@/lib/payments/authorizeNetMerchantTransactionDetails";
import { mergeCheckoutCardOntoCustomer } from "@/lib/customerBillingCardSync";

/**
 * Called when the customer returns from Authorize.net with payment success.
 * Marks the booking as paid and sends a receipt email (same behavior as Stripe webhook).
 * Only updates when payment_status is pending (idempotent thereafter).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const bookingId = typeof body.booking_id === "string" ? body.booking_id.trim() : null;
    const businessId = typeof body.business_id === "string" ? body.business_id.trim() : null;
    const transId =
      typeof body.trans_id === "string"
        ? body.trans_id.trim()
        : typeof body.transaction_id === "string"
          ? body.transaction_id.trim()
          : null;

    if (!bookingId) {
      return NextResponse.json({ error: "booking_id is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(
        "id, business_id, customer_id, payment_status, payment_method, customer_email, customer_name, service, total_price"
      )
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const b = booking as {
      business_id?: string;
      customer_id?: string | null;
      payment_status?: string;
      payment_method?: string;
      customer_email?: string | null;
      customer_name?: string | null;
      service?: string | null;
      total_price?: number | null;
    };

    if (b.payment_status !== "pending") {
      return NextResponse.json({ ok: true, already: true });
    }
    // Admin “Booking Charges” may set payment_method to online only when sending the link; many rows
    // still have payment_method 'cash' from intake until then. If we're completing hosted checkout for
    // this booking_id, pending → paid is correct regardless of the previous method label.
    if (businessId && b.business_id !== businessId) {
      return NextResponse.json({ error: "Booking does not match business" }, { status: 400 });
    }

    const bizIdForRow = b.business_id ?? businessId ?? null;

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ payment_status: "paid" })
      .eq("id", bookingId);

    if (updateError) {
      console.error("[Authorize.net confirm-return] Failed to update booking:", bookingId, updateError);
      return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
    }

    if (transId && bizIdForRow) {
      try {
        const { data: biz } = await supabase
          .from("businesses")
          .select("authorize_net_api_login_id, authorize_net_transaction_key, payment_provider")
          .eq("id", bizIdForRow)
          .maybeSingle();
        const row = biz as {
          payment_provider?: string | null;
          authorize_net_api_login_id?: string | null;
          authorize_net_transaction_key?: string | null;
        } | null;
        if (
          row?.payment_provider === "authorize_net" &&
          row.authorize_net_api_login_id &&
          row.authorize_net_transaction_key
        ) {
          const snap = await fetchMerchantTransactionCardSnapshot(
            row.authorize_net_api_login_id,
            row.authorize_net_transaction_key,
            transId
          );
          if (snap.responseCode === "1" && (snap.last4 || snap.brand)) {
            await supabase
              .from("bookings")
              .update({
                ...(snap.last4 ? { card_last4: snap.last4 } : {}),
                ...(snap.brand ? { card_brand: snap.brand } : {}),
                updated_at: new Date().toISOString(),
              })
              .eq("id", bookingId)
              .eq("business_id", bizIdForRow);
            if (b.customer_id && (snap.last4 || snap.brand)) {
              await mergeCheckoutCardOntoCustomer(supabase, {
                customerId: b.customer_id,
                businessId: bizIdForRow,
                last4: snap.last4,
                brand: snap.brand,
                expMonth: snap.expMonth,
                expYear: snap.expYear,
              });
            }
          }
        }
      } catch (e) {
        console.warn("[Authorize.net confirm-return] card snapshot skipped:", e);
      }
    }

    const custEmail = b.customer_email;
    if (custEmail) {
      try {
        const { data: biz } = b.business_id
          ? await supabase
              .from("businesses")
              .select("name, business_email, business_phone")
              .eq("id", b.business_id)
              .single()
          : { data: null };
        const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
        const emailService = new EmailService();
        await emailService.sendReceiptEmail({
          to: custEmail,
          customerName: b.customer_name ?? "Customer",
          businessName: (biz as { name?: string } | null)?.name ?? "Your Business",
          service: b.service ?? null,
          amount: Number(b.total_price ?? 0),
          bookingRef: bkRef,
          paymentMethod: "card",
          supportEmail: (biz as { business_email?: string | null } | null)?.business_email ?? null,
          supportPhone: (biz as { business_phone?: string | null } | null)?.business_phone ?? null,
        });
      } catch (e) {
        console.warn("[Authorize.net confirm-return] Receipt email failed:", e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Authorize.net confirm-return] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
