import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      request.nextUrl.searchParams.get('businessId')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      customer: {
        ...customer,
        joinDate: customer.join_date,
        totalBookings: customer.total_bookings ?? 0,
        totalSpent: customer.total_spent != null ? `$${Number(customer.total_spent).toFixed(2)}` : '$0.00',
        lastBooking: customer.last_booking,
        company: customer.company ?? '',
        firstName: customer.first_name ?? '',
        lastName: customer.last_name ?? '',
        gender: customer.gender ?? 'unspecified',
        notes: customer.notes ?? '',
        smsReminders: customer.sms_reminders !== false,
        contacts: Array.isArray(customer.contacts) ? customer.contacts : [],
        addresses: Array.isArray(customer.addresses) ? customer.addresses : [],
        billingCards: Array.isArray(customer.billing_cards) ? customer.billing_cards : [],
        stripeCustomerId: customer.stripe_customer_id ?? null,
      },
    });
  } catch (err) {
    console.error('Customer GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const body = await request.json();
    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      (typeof body.businessId === 'string' ? body.businessId.trim() : '') ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.access_blocked !== undefined) updatePayload.access_blocked = body.access_blocked;
    if (body.booking_blocked !== undefined) updatePayload.booking_blocked = body.booking_blocked;
    if (body.email_notifications !== undefined) updatePayload.email_notifications = body.email_notifications;
    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.email !== undefined) updatePayload.email = body.email;
    if (body.phone !== undefined) updatePayload.phone = body.phone;
    if (body.address !== undefined) updatePayload.address = body.address;
    if (body.tags !== undefined) updatePayload.tags = body.tags;
    if (body.company !== undefined) updatePayload.company = body.company;
    if (body.first_name !== undefined) updatePayload.first_name = body.first_name;
    if (body.firstName !== undefined) updatePayload.first_name = body.firstName;
    if (body.last_name !== undefined) updatePayload.last_name = body.last_name;
    if (body.lastName !== undefined) updatePayload.last_name = body.lastName;
    if (body.gender !== undefined) updatePayload.gender = body.gender;
    if (body.notes !== undefined) updatePayload.notes = body.notes;
    if (body.sms_reminders !== undefined) updatePayload.sms_reminders = body.sms_reminders;
    if (body.smsReminders !== undefined) updatePayload.sms_reminders = body.smsReminders;
    if (body.contacts !== undefined) updatePayload.contacts = Array.isArray(body.contacts) ? body.contacts : [];
    if (body.addresses !== undefined) updatePayload.addresses = Array.isArray(body.addresses) ? body.addresses : [];
    if (body.billingCards !== undefined)
      updatePayload.billing_cards = Array.isArray(body.billingCards) ? body.billingCards : [];

    let attemptPayload: Record<string, unknown> = { ...updatePayload };
    let customer: any = null;
    let error: any = null;

    const optionalColumnFields: Array<keyof typeof attemptPayload> = [
      'contacts',
      'addresses',
      'billing_cards',
      'company',
      'first_name',
      'last_name',
      'gender',
      'notes',
      'sms_reminders',
      'access_blocked',
      'booking_blocked',
      'email_notifications',
      'tags',
    ];

    for (let i = 0; i < optionalColumnFields.length + 1; i++) {
      const res = await supabase
        .from('customers')
        .update(attemptPayload)
        .eq('id', id)
        .eq('business_id', businessId)
        .select()
        .single();
      customer = res.data;
      error = res.error;
      if (!error) break;

      const msg = String(error.message || '').toLowerCase();
      const isMissingColumnError =
        msg.includes('column') &&
        (msg.includes('does not exist') || msg.includes('schema cache') || msg.includes('could not find'));
      if (!isMissingColumnError) break;

      let stripped = false;
      for (const field of optionalColumnFields) {
        if (!(field in attemptPayload)) continue;
        if (msg.includes(String(field).toLowerCase())) {
          delete attemptPayload[field];
          stripped = true;
        }
      }
      if (!stripped) {
        const nextField = optionalColumnFields.find((f) => f in attemptPayload);
        if (nextField) {
          delete attemptPayload[nextField];
          stripped = true;
        }
      }
      if (!stripped) break;
    }

    if (error) {
      console.error('Customer update error:', error);
      if (error.code === 'PGRST116' || String(error.message || '').toLowerCase().includes('0 rows')) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
      if (error.code === '23505') {
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('email') || msg.includes('customers_email_business_id_unique')) {
          return NextResponse.json(
            { error: 'Email is already used by another customer in this business.' },
            { status: 409 }
          );
        }
      }
      return NextResponse.json(
        { error: 'Failed to update customer', details: error.message ?? null },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, customer });
  } catch (err) {
    console.error('Customer PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
