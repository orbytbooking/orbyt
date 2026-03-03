import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const supabaseAdmin = getAdmin();
    const { data: customer, error } = await supabaseAdmin
      .from('customers')
      .select('id, name, email, phone, address, status, tags, access_blocked, booking_blocked, email_notifications, created_at, join_date, total_bookings, total_spent, last_booking, business_id, auth_user_id, company, first_name, last_name, gender, notes, sms_reminders, contacts, addresses')
      .eq('id', id)
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
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const supabaseAdmin = getAdmin();

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

    const { data: customer, error } = await supabaseAdmin
      .from('customers')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Customer update error:', error);
      return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
    }

    return NextResponse.json({ success: true, customer });
  } catch (err) {
    console.error('Customer PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
