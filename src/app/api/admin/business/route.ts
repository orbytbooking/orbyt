import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Create admin client directly in the API route
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

console.log('=== BUSINESS API INIT DEBUG ===');
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
console.log('SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);

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
    console.log('=== BUSINESS API DEBUG ===');
    console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
    console.log('SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
    console.log('SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
    
    // Temporarily bypass auth for testing
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Auth user:', user?.id || 'No user');
    console.log('Auth error:', authError);
    
    // For testing: return business data even without authentication
    // Get the most recent business for testing
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    console.log('Business data:', business);
    console.log('Business error:', businessError);
    
    if (businessError) {
      console.error('Business fetch error:', businessError);
      return NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 });
    }

    if (!business) {
      console.log('No business found, creating test business');
      // Create test business
      const { data: newBusiness, error: createError } = await supabase
        .from('businesses')
        .insert({
          name: 'Test Business',
          address: '123 Test St',
          category: 'Test Category',
          owner_id: '22db49cb-133f-4091-8f01-5bbb4893f371',
          plan: 'starter',
          is_active: true
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Business creation error:', createError);
        return NextResponse.json({ error: 'Failed to create business' }, { status: 500 });
      }
      
      return NextResponse.json({ business: newBusiness });
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
    console.log('=== BUSINESS PUT API DEBUG ===');
    
    // Temporarily bypass auth for testing
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('PUT Auth user:', user?.id || 'No user');
    console.log('PUT Auth error:', authError);
    
    // For testing: allow updates even without authentication
    const body = await request.json();
    const validatedData = businessUpdateSchema.parse(body);
    
    console.log('PUT body:', validatedData);
    
    // Update business - handle missing columns gracefully
    const updateData: any = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    };
    
    // Update the most recent business
    const { data: business, error: updateError } = await supabase
      .from('businesses')
      .update(updateData)
      .eq('id', '20ec44c8-1d49-45b9-ac7e-0412fd610ffb')
      .select()
      .single();
    
    console.log('PUT Business update result:', business);
    console.log('PUT Business update error:', updateError);

    if (updateError) {
      console.error('Business update error:', updateError);
      // If column doesn't exist, try with only existing columns
      if (updateError.message.includes('column') && updateError.message.includes('does not exist')) {
        const basicUpdate = {
          name: validatedData.name,
          address: validatedData.address,
          category: validatedData.category,
          domain: validatedData.domain,
          updated_at: new Date().toISOString(),
        };
        
        const { data: fallbackBusiness, error: fallbackError } = await supabase
          .from('businesses')
          .update(basicUpdate)
          .eq('owner_id', user.id)
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
