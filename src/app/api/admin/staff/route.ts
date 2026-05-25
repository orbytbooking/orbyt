import type { SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '@/lib/emailService';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';
import { normalizeModulePermissionsMap } from '@/lib/adminModulePermissions';

type StaffRole = 'admin' | 'manager' | 'staff';

function normalizeStaffRole(r: unknown): StaffRole {
  const s = typeof r === 'string' ? r.toLowerCase().trim() : '';
  if (s === 'admin' || s === 'manager' || s === 'staff') return s;
  return 'staff';
}

const PROVIDER_EMAIL_CONFLICT =
  'This email is already used for a service provider on this business. Staff CRM accounts must use a different email than any provider, or change the provider’s email first.';

async function emailUsedByProviderOnBusiness(
  supabase: SupabaseClient,
  businessId: string,
  emailLower: string
): Promise<boolean> {
  const { data: rows } = await supabase
    .from('service_providers')
    .select('email')
    .eq('business_id', businessId);
  const list = (rows as { email?: string }[] | null) ?? [];
  return list.some((p) => (p.email ?? '').trim().toLowerCase() === emailLower);
}

/**
 * POST: Create a staff row. If sendInvitation is true, creates staff_invitations + sends email (provider-style).
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId, user } = ctx;

    const body = await request.json().catch(() => ({}));
    const hinted =
      (typeof body.businessId === 'string' ? body.businessId.trim() : '') ||
      request.headers.get('x-business-id')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const sendInvitation = body.sendInvitation !== false;

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'firstName, lastName, and email are required' }, { status: 400 });
    }

    const role = normalizeStaffRole(body.role);
    const gender = typeof body.gender === 'string' && body.gender ? body.gender : null;
    const phone = typeof body.phone === 'string' ? body.phone : null;
    const alternatePhone = typeof body.alternatePhone === 'string' ? body.alternatePhone : null;
    const address = typeof body.address === 'string' ? body.address : null;
    const apartment = typeof body.apartment === 'string' ? body.apartment : null;
    const image = typeof body.image === 'string' ? body.image : null;
    const permissions = normalizeModulePermissionsMap(body.permissions);

    const { data: businessRow, error: bizErr } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .single();
    if (bizErr || !businessRow) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const providerEmailClash = await emailUsedByProviderOnBusiness(supabase, businessId, email);
    if (providerEmailClash) {
      return NextResponse.json({ error: PROVIDER_EMAIL_CONFLICT }, { status: 409 });
    }

    if (sendInvitation) {
      const { data: pendingOther } = await supabase
        .from('staff_invitations')
        .select('id')
        .eq('business_id', businessId)
        .eq('email', email)
        .eq('status', 'pending')
        .maybeSingle();
      if (pendingOther) {
        return NextResponse.json(
          { error: 'A pending staff invitation already exists for this email' },
          { status: 409 }
        );
      }
    }

    const staffPayload = {
      business_id: businessId,
      first_name: firstName,
      last_name: lastName,
      email,
      role,
      gender,
      phone,
      alternate_phone: alternatePhone,
      address,
      apartment,
      send_invitation: sendInvitation,
      image,
      status: 'active',
      last_active: new Date().toISOString(),
      permissions,
    };

    const { data: staffRow, error: staffErr } = await supabase
      .from('staff')
      .insert(staffPayload)
      .select('id')
      .single();

    if (staffErr || !staffRow) {
      console.error('staff insert:', staffErr);
      return NextResponse.json(
        { error: staffErr?.message || 'Failed to create staff record' },
        { status: 500 }
      );
    }

    const staffId = staffRow.id as string;

    if (!sendInvitation) {
      return NextResponse.json({
        success: true,
        staff: { id: staffId },
        invitationSent: false,
      });
    }

    const invitationToken = uuidv4();
    const { error: invErr } = await supabase.from('staff_invitations').insert({
      business_id: businessId,
      staff_id: staffId,
      email,
      invitation_token: invitationToken,
      status: 'pending',
      invited_by: user.id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (invErr) {
      console.error('staff_invitations insert:', invErr);
      await supabase.from('staff').delete().eq('id', staffId);
      return NextResponse.json(
        { error: invErr.message || 'Failed to create invitation' },
        { status: 500 }
      );
    }

    const emailService = new EmailService();
    const emailSent = await emailService.sendStaffInvitation({
      email,
      firstName,
      lastName,
      businessName: (businessRow as { name: string }).name,
      invitationToken,
    });

    return NextResponse.json({
      success: true,
      staff: { id: staffId },
      invitationSent: emailSent,
      message: emailSent
        ? 'Staff added and invitation email sent.'
        : 'Staff added; invitation created but email may not have sent (check Resend / logs).',
    });
  } catch (e) {
    console.error('POST /api/admin/staff:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
