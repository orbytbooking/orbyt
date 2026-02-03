import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';

// Create admin client directly in the API route
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const businessUpdateSchema = z.object({
  name: z.string().min(1, 'Business name is required').optional(),
  address: z.string().optional(),
  category: z.string().optional(),
  plan: z.string().optional(),
  domain: z.string().optional(),
  subdomain: z.string().optional(),
  business_email: z.string().optional(),
  business_phone: z.string().optional(),
  city: z.string().optional(),
  zip_code: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  logo_url: z.string().optional(),
});

// GET business information
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }

    // Check user role - only allow owners and admins
    const userRole = user.user_metadata?.role || 'owner';
    if (userRole === 'customer') {
      return createForbiddenResponse('Customers cannot access admin endpoints');
    }

    const userId = user.id;

    // Get business for the authenticated user
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', userId)
      .single();
    
    if (businessError && businessError.code !== 'PGRST116') {
      console.error('Business fetch error:', businessError);
      return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 });
    }

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({ business });
  } catch (error) {
    console.error('Business API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update business information
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }

    // Check user role - only allow owners and admins
    const userRole = user.user_metadata?.role || 'owner';
    if (userRole === 'customer') {
      return createForbiddenResponse('Customers cannot access admin endpoints');
    }

    const userId = user.id;
    const body = await request.json();
    const validatedData = businessUpdateSchema.parse(body);
    
    // First get the user's business to ensure they own it
    const { data: userBusiness, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', userId)
      .single();
    
    if (businessError || !userBusiness) {
      return createForbiddenResponse('Business not found or access denied');
    }

    // Update business - handle missing columns gracefully
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    // Only include non-empty fields to avoid unique constraint violations
    Object.keys(validatedData).forEach(key => {
      const value = validatedData[key as keyof typeof validatedData];
      if (value !== undefined && value !== null && value !== '') {
        updateData[key] = value;
      }
    });
    
    // Update the user's business
    const { data: business, error: updateError } = await supabase
      .from('businesses')
      .update(updateData)
      .eq('id', userBusiness.id)
      .select()
      .single();

    if (updateError) {
      console.error('Business update error:', updateError);
      // If column doesn't exist, try with only existing columns
      if (updateError.message.includes('column') && updateError.message.includes('does not exist')) {
        const basicUpdate: any = {
          updated_at: new Date().toISOString(),
        };
        
        // Only include non-empty basic fields
        if (validatedData.name && validatedData.name !== '') basicUpdate.name = validatedData.name;
        if (validatedData.address && validatedData.address !== '') basicUpdate.address = validatedData.address;
        if (validatedData.category && validatedData.category !== '') basicUpdate.category = validatedData.category;
        if (validatedData.domain && validatedData.domain !== '') basicUpdate.domain = validatedData.domain;
        
        const { data: fallbackBusiness, error: fallbackError } = await supabase
          .from('businesses')
          .update(basicUpdate)
          .eq('id', userBusiness.id)
          .select()
          .single();
          
        if (fallbackError) {
          console.error('Fallback business update error:', fallbackError);
          return NextResponse.json({ error: 'Failed to update business' }, { status: 500 });
        }
        
        return NextResponse.json({ business: fallbackBusiness });
      }
      return NextResponse.json({ error: 'Failed to update business' }, { status: 500 });
    }

    return NextResponse.json({ business });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Business update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
