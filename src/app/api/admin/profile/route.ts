import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Create admin client directly in the API route
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

console.log('=== PROFILE API INIT DEBUG ===');
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
console.log('SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);

const profileUpdateSchema = z.object({
  full_name: z.string().optional(),
  phone: z.string().optional(),
  business_id: z.string().uuid().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  profile_picture: z.string().optional(),
  role: z.enum(['customer', 'provider', 'admin', 'owner', 'manager', 'staff']).optional(),
});

// GET user profile
export async function GET(request: NextRequest) {
  try {
    console.log('=== PROFILE API SERVER DEBUG ===');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
    console.log('Service role key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Auth user:', user?.id || 'No user');
    console.log('Auth error:', authError);
    
    // For testing: bypass authentication and use your user ID
    const userId = user?.id || '76f6a2f5-5feb-4b1a-801c-d27f7212c611';
    
    if (authError && !user) {
      console.log('Auth failed, but continuing with test user ID');
    }

    // Get user profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .limit(1)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // If profile doesn't exist, create one
    if (!profile) {
      // Check if user is a business owner
      const { data: userBusiness } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', userId)
        .single();
      
      const userRole = userBusiness ? 'owner' : 'admin';
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: 'Orbyt Admin',
          phone: '123-456-7890',
          role: userRole,
          is_active: true,
          business_id: userBusiness?.id || '20ec44c8-1d49-45b9-ac7e-0412fd610ffb'
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
    console.log('=== PROFILE PUT API DEBUG ===');
    
    // Temporarily bypass auth for testing
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('PUT Auth user:', user?.id || 'No user');
    console.log('PUT Auth error:', authError);
    
    // For testing: allow updates even without authentication
    const body = await request.json();
    const validatedData = profileUpdateSchema.parse(body);
    
    console.log('PUT body:', validatedData);
    
    // For testing: bypass authentication and use your user ID
    const userId = user?.id || '76f6a2f5-5feb-4b1a-801c-d27f7212c611';
    
    if (authError && !user) {
      console.log('Auth failed, but continuing with test user ID');
    }
    
    // Check if user is trying to assign owner role
    if (validatedData.role === 'owner') {
      // Verify user is actually a business owner
      const { data: userBusiness } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', userId)
        .single();
      
      if (!userBusiness) {
        return NextResponse.json({ error: 'Only business owners can be assigned the owner role' }, { status: 403 });
      }
    }
    
    // Update profile - only include fields that exist in database
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    // Only add fields that exist in the database schema
    if (validatedData.full_name !== undefined) updateData.full_name = validatedData.full_name;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.business_id !== undefined) updateData.business_id = validatedData.business_id;
    if (validatedData.bio !== undefined) updateData.bio = validatedData.bio;
    if (validatedData.location !== undefined) updateData.location = validatedData.location;
    if (validatedData.profile_picture !== undefined) updateData.profile_picture = validatedData.profile_picture;
    if (validatedData.role !== undefined) updateData.role = validatedData.role;
    
    console.log('PUT updateData:', updateData);
    
    // Update the profile
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
    
    console.log('PUT Profile update result:', profile);
    console.log('PUT Profile update error:', updateError);

    if (updateError) {
      console.error('Profile update error:', updateError);
      // If column doesn't exist, try with only existing columns
      if (updateError.message.includes('column') && updateError.message.includes('does not exist')) {
        const basicUpdate = {
          full_name: validatedData.full_name,
          phone: validatedData.phone,
          business_id: validatedData.business_id,
          bio: validatedData.bio,
          location: validatedData.location,
          profile_picture: validatedData.profile_picture,
          role: validatedData.role,
          updated_at: new Date().toISOString(),
        };
        
        const { data: fallbackProfile, error: fallbackError } = await supabase
          .from('profiles')
          .update(basicUpdate)
          .eq('id', user.id)
          .select()
          .single();
          
        if (fallbackError) {
          console.error('Fallback profile update error:', fallbackError);
          return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }
        
        return NextResponse.json({ profile: fallbackProfile });
      }
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
