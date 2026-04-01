import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminNotification } from "@/lib/adminProviderSync";
import { processBookingScheduling } from "@/lib/bookingScheduling";
import { syncBookingCreated, createRecurringCalendarEvent } from "@/lib/googleCalendar";
import { ensureCustomerForAdminBooking } from "@/lib/ensureCustomerForAdminBooking";
import { resolveProviderWageFromBodyOrStoreDefault } from "@/lib/bookingProviderWage";
import { resolveFrequencyRepeatsForBooking } from "@/lib/industryFrequencyRepeats";
import { parseDurationMinutesFromBookingPayload } from "@/lib/bookingDuration";
import { sendCustomerFacingBookingEmailAfterScheduling } from "@/lib/sendCustomerBookingConfirmedEmail";

function normalizeTimeForDb(timeStr: string): string | null {
  if (!timeStr || typeof timeStr !== "string") return null;
  const trimmed = timeStr.trim();
  const amPm = trimmed.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (amPm) {
    let h = parseInt(amPm[1], 10);
    const m = amPm[2] || "00";
    const s = amPm[3] || "00";
    if (amPm[4].toUpperCase() === "PM" && h !== 12) h += 12;
    if (amPm[4].toUpperCase() === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${m}:${s}`;
  }
  const already24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (already24) {
    const h = already24[1].padStart(2, "0");
    const m = already24[2] || "00";
    const s = (already24[3] || "00").padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  return trimmed || null;
}

const parseNum = (v: unknown): number => {
  if (v == null) return 0;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

export type MaterializeResult =
  | { ok: true; primaryBookingId: string }
  | { ok: false; error: string };

/**
 * Insert guest booking(s) from stored book-now payload after Stripe payment succeeds.
 * Mirrors POST /api/guest/bookings insert + side effects (no pre-checkout validation).
 */
export async function materializeGuestBookingFromIntentPayload(
  supabase: SupabaseClient,
  businessId: string,
  body: Record<string, unknown>
): Promise<MaterializeResult> {
  const customerName = (body.customer_name ?? body.customerName ?? "").toString().trim();
  const customerEmail = (body.customer_email ?? body.customerEmail ?? "").toString().trim();
  const customerPhone = (body.customer_phone ?? body.customerPhone ?? body.contact ?? "").toString().trim();
  if (!customerName || !customerEmail) {
    return { ok: false, error: "missing_customer_identity" };
  }

  const date = (body.date ?? "").toString().trim();
  const timeRaw = body.time ?? "";
  const amountNum = parseNum(body.amount);
  const totalNum = parseNum(body.total);
  const subtotalNum = parseNum(body.subtotal);
  const priceNum = parseNum(body.price);
  const totalPrice =
    (amountNum > 0 ? amountNum : null) ??
    (totalNum > 0 ? totalNum : null) ??
    (subtotalNum > 0 ? subtotalNum : null) ??
    (priceNum > 0 ? priceNum : null) ??
    0;

  const timeForDb = normalizeTimeForDb(String(timeRaw));
  const frequency = (body.frequency && String(body.frequency).trim()) || null;
  const providerId = body.provider_id ?? body.providerId ?? body.provider ?? null;
  const providerIdClean = providerId && String(providerId).trim() ? String(providerId).trim() : null;
  const providerName = body.provider_name ?? body.providerName ?? null;

  const { data: existingForBlock } = await supabase
    .from("customers")
    .select("id, booking_blocked")
    .eq("business_id", businessId)
    .ilike("email", customerEmail)
    .maybeSingle();

  if (existingForBlock?.booking_blocked) {
    return { ok: false, error: "customer_blocked" };
  }

  const customerId = await ensureCustomerForAdminBooking(supabase, businessId, {
    customerIdFromClient: existingForBlock?.id ?? null,
    customerEmail,
    customerName,
    customerPhone: customerPhone || null,
    customerAddress: (body.address ?? "").toString().trim() || null,
  });

  if (!customerId) {
    return { ok: false, error: "customer_record_failed" };
  }

  const customizationRaw = body.customization;
  const durationMinutes = parseDurationMinutesFromBookingPayload(body);

  const insert: Record<string, unknown> = {
    business_id: businessId,
    customer_id: customerId,
    customer_name: customerName || null,
    customer_email: customerEmail || null,
    customer_phone: customerPhone || null,
    provider_id: providerIdClean ?? null,
    service: (body.service ?? "").toString().trim() || null,
    address: (body.address ?? "").toString().trim() || "",
    notes: (body.notes ?? "").toString().trim() || null,
    frequency: frequency ?? null,
    total_price: totalPrice,
    amount: totalPrice,
    status: "pending",
    scheduled_date: date || null,
    scheduled_time: timeForDb || null,
    date: date || null,
    time: timeForDb || null,
    payment_method: body.paymentMethod === "online" || body.payment_method === "online" ? "online" : "cash",
    payment_status: "pending",
    tip_amount: body.tipAmount ?? 0,
  };
  if (body.tipUpdatedAt) insert.tip_updated_at = body.tipUpdatedAt;
  if (providerName && String(providerName).trim()) insert.provider_name = String(providerName).trim();
  if (customizationRaw && typeof customizationRaw === "object" && !Array.isArray(customizationRaw)) {
    insert.customization =
      durationMinutes > 0
        ? { ...(customizationRaw as Record<string, unknown>), duration_minutes: durationMinutes }
        : customizationRaw;
  } else if (durationMinutes > 0) {
    insert.customization = { duration_minutes: durationMinutes };
  }
  if (durationMinutes > 0) insert.duration_minutes = durationMinutes;

  const { data: storeWageOpts } = await supabase
    .from("business_store_options")
    .select("default_provider_wage, default_provider_wage_type")
    .eq("business_id", businessId)
    .maybeSingle();
  const wageResolved = resolveProviderWageFromBodyOrStoreDefault(body, storeWageOpts);
  if (wageResolved) {
    insert.provider_wage = wageResolved.provider_wage;
    insert.provider_wage_type = wageResolved.provider_wage_type;
  }

  const freqNorm = (frequency || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
  const recurringByFrequency = !!freqNorm && freqNorm !== "one-time" && freqNorm !== "onetime";
  const createRecurring = body.create_recurring === true || body.create_recurring === "true" || recurringByFrequency;
  const scheduledDate = date || null;
  const timeForRecurring = timeForDb || "09:00:00";

  if (createRecurring && frequency && scheduledDate) {
    const freqName = String(frequency).trim();
    let frequencyRepeats: string | null =
      (body.frequency_repeats && String(body.frequency_repeats).trim()) || null;
    if (!frequencyRepeats) {
      const { data: biz } = await supabase.from("businesses").select("industry_id").eq("id", businessId).single();
      const industryId = (biz as { industry_id?: string } | null)?.industry_id;
      if (industryId) {
        frequencyRepeats = await resolveFrequencyRepeatsForBooking(supabase, businessId, industryId, freqName);
      }
    }
    const endDate = (body.recurring_end_date && String(body.recurring_end_date).trim()) || null;
    const occurrencesAhead = Math.min(Math.max(1, parseInt(String(body.recurring_occurrences_ahead || 8), 10) || 8), 24);

    try {
      const { createRecurringSeries } = await import("@/lib/recurringBookings");
      const template = { ...insert, scheduled_time: timeForRecurring, time: timeForRecurring };
      const { seriesId, bookingIds } = await createRecurringSeries(supabase, businessId, template, {
        startDate: scheduledDate,
        endDate: endDate || undefined,
        frequencyName: freqName,
        frequencyRepeats,
        occurrencesAhead,
        sameProvider: true,
      });
      const { data: firstBooking } = await supabase.from("bookings").select("*").eq("id", bookingIds[0]).single();
      const bkRef = `BK${String(bookingIds[0]).slice(-6).toUpperCase()}`;
      if (firstBooking) {
        const { data: series } = await supabase
          .from("recurring_series")
          .select("start_date, end_date, frequency, frequency_repeats, occurrences_ahead")
          .eq("id", seriesId)
          .single();
        const eventId = series
          ? await createRecurringCalendarEvent(businessId, firstBooking, series).catch(() => null)
          : await syncBookingCreated(businessId, firstBooking).catch(() => null);
        if (eventId) {
          await supabase
            .from("bookings")
            .update({ google_calendar_event_id: eventId })
            .eq("id", firstBooking.id)
            .eq("business_id", businessId);
        }
      }
      await createAdminNotification(businessId, "new_booking", {
        title: "Recurring booking (guest)",
        message: `Recurring booking ${bkRef} created with ${bookingIds.length} occurrences.`,
        link: "/admin/bookings",
      });
      await processBookingScheduling(firstBooking?.id, businessId, {
        providerId: firstBooking?.provider_id,
        scheduledDate: firstBooking?.scheduled_date ?? firstBooking?.date,
        service: firstBooking?.service,
      }).catch((e) => console.warn("Scheduling processing failed:", e));

      if (firstBooking?.id) {
        await sendCustomerFacingBookingEmailAfterScheduling(supabase, businessId, String(firstBooking.id), {
          totalPriceFallback: totalPrice,
          customerEmailFallback: customerEmail,
          customerNameFallback: customerName,
        });
      }

      return { ok: true, primaryBookingId: bookingIds[0] };
    } catch (e: unknown) {
      console.error("materializeGuest recurring error:", e);
      return { ok: false, error: e instanceof Error ? e.message : "recurring_failed" };
    }
  }

  let booking: Record<string, unknown> | null = null;
  let error: { message?: string } | null = null;
  const result = await supabase.from("bookings").insert(insert).select().single();
  booking = result.data as Record<string, unknown> | null;
  error = result.error;

  if (error && /column|schema cache/i.test(String(error.message || ""))) {
    const msg = String(error.message || "").toLowerCase();
    const insertFallback = { ...insert };
    if (/customization/i.test(msg)) delete insertFallback.customization;
    if (/frequency/i.test(msg)) delete insertFallback.frequency;
    if (/provider_name/i.test(msg)) delete insertFallback.provider_name;
    if (/provider_wage/i.test(msg)) {
      delete insertFallback.provider_wage;
      delete insertFallback.provider_wage_type;
    }
    const retry = await supabase.from("bookings").insert(insertFallback).select().single();
    booking = retry.data as Record<string, unknown> | null;
    error = retry.error;
  }

  if (error || !booking?.id) {
    console.error("materializeGuest insert error:", error);
    return { ok: false, error: error?.message || "insert_failed" };
  }

  const bookingId = String(booking.id);

  await processBookingScheduling(bookingId, businessId, {
    providerId: booking.provider_id as string | null,
    scheduledDate: (booking.scheduled_date ?? booking.date) as string | null,
    service: booking.service as string | null,
  }).catch((e) => console.warn("Scheduling processing failed:", e));

  const eventId = await syncBookingCreated(businessId, booking).catch(() => null);
  if (eventId) {
    await supabase.from("bookings").update({ google_calendar_event_id: eventId }).eq("id", bookingId).eq("business_id", businessId);
  }

  const bkRef = `BK${bookingId.slice(-6).toUpperCase()}`;
  await createAdminNotification(businessId, "new_booking", {
    title: "New booking confirmed",
    message: `Booking ${bkRef} has been confirmed.`,
    link: "/admin/bookings",
  });

  await sendCustomerFacingBookingEmailAfterScheduling(supabase, businessId, bookingId, {
    totalPriceFallback: totalPrice,
    customerEmailFallback: customerEmail,
    customerNameFallback: customerName,
  });

  return { ok: true, primaryBookingId: bookingId };
}

/**
 * Insert customer booking(s) from stored payload after Stripe payment succeeds.
 */
export async function materializeCustomerBookingFromIntentPayload(
  supabase: SupabaseClient,
  businessId: string,
  authUserId: string,
  body: Record<string, unknown>
): Promise<MaterializeResult> {
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id, name, email, phone, access_blocked, booking_blocked")
    .eq("auth_user_id", authUserId)
    .eq("business_id", businessId)
    .single();

  if (customerError || !customer) {
    return { ok: false, error: "customer_not_found" };
  }

  if ((customer as { access_blocked?: boolean }).access_blocked || (customer as { booking_blocked?: boolean }).booking_blocked) {
    return { ok: false, error: "customer_blocked" };
  }

  const date = (body.date ?? "").toString().trim();
  const timeRaw = body.time ?? "";
  const amountNum = parseNum(body.amount);
  const totalNum = parseNum(body.total);
  const subtotalNum = parseNum(body.subtotal);
  const priceNum = parseNum(body.price);
  const totalPrice =
    (amountNum > 0 ? amountNum : null) ??
    (totalNum > 0 ? totalNum : null) ??
    (subtotalNum > 0 ? subtotalNum : null) ??
    (priceNum > 0 ? priceNum : null) ??
    0;

  const timeForDb = normalizeTimeForDb(String(timeRaw));
  const frequency = (body.frequency && String(body.frequency).trim()) || null;
  const providerId = body.provider_id ?? body.providerId ?? body.provider ?? null;
  const providerIdClean = providerId && String(providerId).trim() ? String(providerId).trim() : null;
  const notesVal = (body.notes ?? "").toString().trim();

  const durationMinutes = parseDurationMinutesFromBookingPayload(body);

  const insertMinimal: Record<string, unknown> = {
    business_id: businessId,
    customer_id: customer.id,
    customer_name: (customer.name ?? body.contact ?? "").toString().trim() || null,
    customer_email: (customer.email ?? "").toString().trim() || null,
    customer_phone: (customer.phone ?? body.contact ?? "").toString().trim() || null,
    provider_id: providerIdClean ?? null,
    service: (body.service ?? "").toString().trim() || null,
    address: (body.address ?? "").toString().trim() || "",
    notes: notesVal || null,
    frequency: frequency ?? null,
    total_price: totalPrice,
    amount: totalPrice,
    status: "pending",
    scheduled_date: date && String(date).trim() ? String(date).trim() : null,
    scheduled_time: timeForDb ?? null,
    date: date && String(date).trim() ? String(date).trim() : null,
    time: timeForDb ?? null,
    payment_method: body.paymentMethod === "online" || body.payment_method === "online" ? "online" : "cash",
    payment_status: "pending",
    tip_amount: body.tipAmount ?? 0,
  };

  const rowInsert: Record<string, unknown> = { ...insertMinimal };
  if (durationMinutes > 0) rowInsert.duration_minutes = durationMinutes;
  if (body.tipUpdatedAt) rowInsert.tip_updated_at = body.tipUpdatedAt;
  const providerName = body.provider_name ?? body.providerName ?? null;
  if (providerName && String(providerName).trim()) rowInsert.provider_name = String(providerName).trim();
  const customizationRaw = body.customization;
  if (customizationRaw && typeof customizationRaw === "object" && !Array.isArray(customizationRaw)) {
    rowInsert.customization =
      durationMinutes > 0
        ? { ...(customizationRaw as Record<string, unknown>), duration_minutes: durationMinutes }
        : customizationRaw;
  } else if (durationMinutes > 0) {
    rowInsert.customization = { duration_minutes: durationMinutes };
  }

  const { data: storeWageOpts } = await supabase
    .from("business_store_options")
    .select("default_provider_wage, default_provider_wage_type")
    .eq("business_id", businessId)
    .maybeSingle();
  const wageResolved = resolveProviderWageFromBodyOrStoreDefault(body, storeWageOpts);
  if (wageResolved) {
    rowInsert.provider_wage = wageResolved.provider_wage;
    rowInsert.provider_wage_type = wageResolved.provider_wage_type;
  }

  const freqNorm = (frequency || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
  const recurringByFrequency = !!freqNorm && freqNorm !== "one-time" && freqNorm !== "onetime";
  const createRecurring = body.create_recurring === true || body.create_recurring === "true" || recurringByFrequency;
  const scheduledDate = date && String(date).trim() ? String(date).trim() : null;
  const timeForRecurring = timeForDb || "09:00:00";

  if (createRecurring && frequency && scheduledDate) {
    const freqName = frequency.trim();
    let frequencyRepeats: string | null =
      (body.frequency_repeats && String(body.frequency_repeats).trim()) || null;
    if (!frequencyRepeats) {
      const { data: biz } = await supabase.from("businesses").select("industry_id").eq("id", businessId).single();
      const industryId = (biz as { industry_id?: string } | null)?.industry_id;
      if (industryId) {
        frequencyRepeats = await resolveFrequencyRepeatsForBooking(supabase, businessId, industryId, freqName);
      }
    }
    const endDate = (body.recurring_end_date && String(body.recurring_end_date).trim()) || null;
    const occurrencesAhead = Math.min(Math.max(1, parseInt(String(body.recurring_occurrences_ahead || 8), 10) || 8), 24);

    try {
      const { createRecurringSeries } = await import("@/lib/recurringBookings");
      const template = { ...rowInsert, scheduled_time: timeForRecurring, time: timeForRecurring };
      const { seriesId, bookingIds } = await createRecurringSeries(supabase, businessId, template, {
        startDate: scheduledDate,
        endDate: endDate || undefined,
        frequencyName: freqName,
        frequencyRepeats,
        occurrencesAhead,
        sameProvider: true,
      });
      const { data: firstBooking } = await supabase.from("bookings").select("*").eq("id", bookingIds[0]).single();
      const bkRef = `BK${String(bookingIds[0]).slice(-6).toUpperCase()}`;
      if (firstBooking) {
        const { data: series } = await supabase
          .from("recurring_series")
          .select("start_date, end_date, frequency, frequency_repeats, occurrences_ahead")
          .eq("id", seriesId)
          .single();
        const eventId = series
          ? await createRecurringCalendarEvent(businessId, firstBooking, series).catch(() => null)
          : await syncBookingCreated(businessId, firstBooking).catch(() => null);
        if (eventId) {
          await supabase
            .from("bookings")
            .update({ google_calendar_event_id: eventId })
            .eq("id", firstBooking.id)
            .eq("business_id", businessId);
        }
      }
      await createAdminNotification(businessId, "new_booking", {
        title: "Recurring booking (customer)",
        message: `Recurring booking ${bkRef} created with ${bookingIds.length} occurrences.`,
        link: "/admin/bookings",
      });
      await processBookingScheduling(firstBooking?.id, businessId, {
        providerId: firstBooking?.provider_id,
        scheduledDate: firstBooking?.scheduled_date ?? firstBooking?.date,
        service: firstBooking?.service,
      }).catch((e) => console.warn("Scheduling processing failed:", e));

      if (firstBooking?.id) {
        await sendCustomerFacingBookingEmailAfterScheduling(supabase, businessId, String(firstBooking.id), {
          totalPriceFallback: totalPrice,
          customerEmailFallback: (firstBooking?.customer_email ?? customer.email ?? "").toString().trim() || null,
          customerNameFallback: (firstBooking?.customer_name ?? customer.name ?? "Customer").toString(),
        });
      }

      return { ok: true, primaryBookingId: bookingIds[0] };
    } catch (e: unknown) {
      console.error("materializeCustomer recurring error:", e);
      return { ok: false, error: e instanceof Error ? e.message : "recurring_failed" };
    }
  }

  let booking: Record<string, unknown> | null = null;
  let insertError: { message?: string } | null = null;

  const ins = await supabase.from("bookings").insert(rowInsert).select().single();
  booking = ins.data as Record<string, unknown> | null;
  insertError = ins.error;

  if (insertError && /column|schema cache/i.test(String(insertError.message || ""))) {
    const msg = String(insertError.message || "").toLowerCase();
    const insertFallback = { ...rowInsert };
    if (/customization/i.test(msg)) delete (insertFallback as Record<string, unknown>).customization;
    if (/frequency/i.test(msg)) delete insertFallback.frequency;
    if (/provider_name/i.test(msg)) delete (insertFallback as Record<string, unknown>).provider_name;
    if (/provider_wage/i.test(msg)) {
      delete (insertFallback as Record<string, unknown>).provider_wage;
      delete (insertFallback as Record<string, unknown>).provider_wage_type;
    }
    const retry = await supabase.from("bookings").insert(insertFallback).select().single();
    booking = retry.data as Record<string, unknown> | null;
    insertError = retry.error;
  }
  if (insertError) {
    const retry = await supabase.from("bookings").insert(insertMinimal).select().single();
    booking = retry.data as Record<string, unknown> | null;
    insertError = retry.error;
  }

  if (insertError || !booking?.id) {
    console.error("materializeCustomer insert error:", insertError);
    return { ok: false, error: insertError?.message || "insert_failed" };
  }

  const bookingId = String(booking.id);

  await processBookingScheduling(bookingId, businessId, {
    providerId: booking.provider_id as string | null,
    scheduledDate: (booking.scheduled_date ?? booking.date) as string | null,
    service: booking.service as string | null,
  }).catch((e) => console.warn("Scheduling processing failed:", e));

  const eventId = await syncBookingCreated(businessId, booking).catch(() => null);
  if (eventId) {
    await supabase.from("bookings").update({ google_calendar_event_id: eventId }).eq("id", bookingId).eq("business_id", businessId);
  }

  const bkRef = `BK${bookingId.slice(-6).toUpperCase()}`;
  await createAdminNotification(businessId, "new_booking", {
    title: "New booking confirmed",
    message: `Booking ${bkRef} has been confirmed.`,
    link: "/admin/bookings",
  });

  await sendCustomerFacingBookingEmailAfterScheduling(supabase, businessId, bookingId, {
    totalPriceFallback: totalPrice,
    customerEmailFallback: (booking.customer_email ?? customer.email ?? "").toString().trim() || null,
    customerNameFallback: (booking.customer_name ?? customer.name ?? "Customer").toString(),
  });

  return { ok: true, primaryBookingId: bookingId };
}
