import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth-helpers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const profileUpdateSchema = z.object({
  full_name: z.string().optional(),
  phone: z.string().optional(),
  business_id: z.string().uuid().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  profile_picture: z.string().optional(),
  role: z.enum(['customer', 'provider', 'admin', 'owner', 'manager', 'staff']).optional(),
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
      const { data: userBusiness } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('owner_id', userId)
        .single();

      const userRole = userBusiness ? 'owner' : 'admin';
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Orbyt Admin',
          phone: '',
          role: userRole,
          is_active: true,
          business_id: userBusiness?.id ?? null,
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
