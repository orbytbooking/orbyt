import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminGate } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin } = gate;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const { data: customer, error } = await admin
      .from("customers")
      .select(
        "id, business_id, name, email, phone, address, company, first_name, last_name, gender, notes, status, access_blocked, booking_blocked, created_at, updated_at, join_date, total_bookings, total_spent, last_booking, email_notifications, sms_notifications, push_notifications, sms_reminders, tags"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const [{ data: business }, { count: bookingsCount }] = await Promise.all([
      admin.from("businesses").select("id, name, plan, is_active").eq("id", (customer as any).business_id).maybeSingle(),
      admin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", id),
    ]);

    return NextResponse.json({
      kind: "customer",
      person: {
        id: (customer as any).id,
        full_name: (customer as any).name ?? null,
        email: (customer as any).email ?? null,
        phone: (customer as any).phone ?? null,
        address: (customer as any).address ?? null,
        company: (customer as any).company ?? null,
        first_name: (customer as any).first_name ?? null,
        last_name: (customer as any).last_name ?? null,
        gender: (customer as any).gender ?? null,
        notes: (customer as any).notes ?? null,
        status: (customer as any).status ?? null,
        access_blocked: Boolean((customer as any).access_blocked),
        booking_blocked: Boolean((customer as any).booking_blocked),
        created_at: (customer as any).created_at ?? null,
        updated_at: (customer as any).updated_at ?? null,
        join_date: (customer as any).join_date ?? null,
        last_booking: (customer as any).last_booking ?? null,
        total_bookings: (customer as any).total_bookings ?? null,
        total_spent: (customer as any).total_spent ?? null,
        email_notifications: Boolean((customer as any).email_notifications),
        sms_notifications: Boolean((customer as any).sms_notifications),
        push_notifications: Boolean((customer as any).push_notifications),
        sms_reminders: Boolean((customer as any).sms_reminders),
        tags: (customer as any).tags ?? [],
      },
      business: business
        ? {
            id: (business as any).id,
            name: (business as any).name,
            plan: (business as any).plan,
            is_active: (business as any).is_active !== false,
          }
        : null,
      counts: {
        bookings: bookingsCount ?? 0,
      },
    });
  } catch (e) {
    console.error("[super-admin customer detail]", e);
    return NextResponse.json({ error: "Failed to load customer details" }, { status: 500 });
  }
}

