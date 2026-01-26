import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const locationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
  active: z.boolean().default(true),
  business_id: z.string()
});

// Get all locations for a business
export async function GET(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get('business_id');

    if (!business_id) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const { data: locations, error } = await supabase
      .from('locations')
      .select('*')
      .eq('business_id', business_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching locations:', error);
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Error in GET /api/locations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create a new location
export async function POST(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = locationSchema.parse(body);

    const { data: location, error } = await supabase
      .from('locations')
      .insert([validatedData])
      .select()
      .single();

    if (error) {
      console.error('Error creating location:', error);
      return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
    }

    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    
    console.error('Error in POST /api/locations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update a location
export async function PUT(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    const validatedData = locationSchema.partial().parse(updateData);

    const { data: location, error } = await supabase
      .from('locations')
      .update(validatedData)
      .eq('id', id)
      .eq('business_id', validatedData.business_id || body.business_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating location:', error);
      return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
    }

    return NextResponse.json({ location });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    
    console.error('Error in PUT /api/locations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete a location
export async function DELETE(request: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const business_id = searchParams.get('business_id');

    if (!id || !business_id) {
      return NextResponse.json({ error: 'Location ID and Business ID are required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id)
      .eq('business_id', business_id);

    if (error) {
      console.error('Error deleting location:', error);
      return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/locations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
