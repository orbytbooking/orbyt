import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth-helpers';
import { userCanManageBookingsForBusiness } from '@/lib/bookingApiAuth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** First owned business, else first active tenant_users row (staff CRM workspace). */
async function resolveDefaultBusinessIdForUser(userId: string): Promise<{ businessId: string | null; isOwner: boolean }> {
  const { data: owned } = await supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (owned?.id) return { businessId: owned.id, isOwner: true };

  const { data: tu } = await supabaseAdmin
    .from('tenant_users')
    .select('business_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  return { businessId: tu?.business_id ?? null, isOwner: false };
}

const profileUpdateSchema = z.object({
  full_name: z.string().optional(),
  phone: z.string().optional(),
  business_id: z.string().uuid().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  profile_picture: z.string().optional(),
  role: z.enum(['customer', 'provider', 'admin', 'owner', 'manager', 'staff']).optional(),
  email_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
  admin_theme: z.enum(['light', 'dark']).optional(),
});

// GET user profile (uses session from cookies to identify user)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }
    const userId = user.id;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .limit(1)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    if (!profile) {
      const { businessId, isOwner } = await resolveDefaultBusinessIdForUser(userId);
      const userRole = isOwner ? 'owner' : 'admin';
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Orbyt Admin',
          phone: '',
          role: userRole,
          is_active: true,
          business_id: businessId,
          admin_theme: 'light',
        })
        .select()
        .single();

      if (createError) {
        console.error('Profile creation error:', createError);
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }
      return NextResponse.json({ profile: newProfile });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update user profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }
    const userId = user.id;

    const body = await request.json();
    const validatedData = profileUpdateSchema.parse(body);

    if (validatedData.role === 'owner') {
      const { data: userBusiness } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('owner_id', userId)
        .single();

      if (!userBusiness) {
        return NextResponse.json({ error: 'Only business owners can be assigned the owner role' }, { status: 403 });
      }
    }

    if (validatedData.business_id !== undefined && validatedData.business_id !== null) {
      const ok = await userCanManageBookingsForBusiness(supabaseAdmin, userId, validatedData.business_id);
      if (!ok) {
        return NextResponse.json({ error: 'You do not have access to that business' }, { status: 403 });
      }
    }

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (!existingProfile) {
      const { businessId, isOwner } = await resolveDefaultBusinessIdForUser(userId);
      const { error: bootstrapErr } = await supabaseAdmin.from('profiles').insert({
        id: userId,
        full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Orbyt Admin',
        phone: '',
        role: isOwner ? 'owner' : 'admin',
        is_active: true,
        business_id: businessId,
        admin_theme: 'light',
      });
      if (bootstrapErr && (bootstrapErr as { code?: string }).code !== '23505') {
        console.error('Profile bootstrap on PUT error:', bootstrapErr);
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (validatedData.full_name !== undefined) updateData.full_name = validatedData.full_name;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.business_id !== undefined) updateData.business_id = validatedData.business_id;
    if (validatedData.bio !== undefined) updateData.bio = validatedData.bio;
    if (validatedData.location !== undefined) updateData.location = validatedData.location;
    if (validatedData.profile_picture !== undefined) updateData.profile_picture = validatedData.profile_picture;
    if (validatedData.role !== undefined) updateData.role = validatedData.role;
    if (validatedData.email_notifications !== undefined) {
      updateData.email_notifications = validatedData.email_notifications;
    }
    if (validatedData.push_notifications !== undefined) {
      updateData.push_notifications = validatedData.push_notifications;
    }
    if (validatedData.admin_theme !== undefined) updateData.admin_theme = validatedData.admin_theme;

    const { data: profile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Profile update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
