import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getPlatformPlanLimitsForBusiness } from '@/lib/platform-billing/resolvePlanLimits';

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
  business_id: z.string(),
  drawn_shape_json: z.unknown().nullable().optional(),
  excluded_provider_ids: z.array(z.string()).optional(),
});

function toLocationInsertRow(
  v: z.infer<typeof locationSchema>
): Record<string, unknown> {
  return {
    business_id: v.business_id,
    name: v.name,
    city: v.city ?? null,
    state: v.state ?? null,
    postal_code: v.postalCode ?? null,
    latitude: v.latitude ?? null,
    longitude: v.longitude ?? null,
    address: v.address ?? null,
    active: v.active,
    drawn_shape_json: v.drawn_shape_json ?? null,
    excluded_provider_ids: v.excluded_provider_ids ?? [],
  };
}

// Get all locations for a business (uses service role; no auth required so server-side fetch works)
export async function GET(request: NextRequest) {
  try {
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

// Create a new location (service role; validate business_id only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = locationSchema.parse(body);

    const limits = await getPlatformPlanLimitsForBusiness(supabase, validatedData.business_id);
    const maxCalendars = limits.max_calendars;
    if (maxCalendars !== null && maxCalendars >= 0) {
      const { count, error: countError } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', validatedData.business_id);

      if (countError) {
        console.error('Location limit count error:', countError);
      } else {
        const current = count ?? 0;
        if (current >= maxCalendars) {
          return NextResponse.json(
            {
              error: `Your plan allows up to ${maxCalendars} location${maxCalendars === 1 ? '' : 's'} (calendars). Upgrade your plan or remove a location to add another.`,
              code: 'PLAN_LOCATION_LIMIT',
              max_calendars: maxCalendars,
              current,
            },
            { status: 403 }
          );
        }
      }
    }

    const { data: location, error } = await supabase
      .from('locations')
      .insert([toLocationInsertRow(validatedData)])
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

// Update a location (service role; validate business_id only)
export async function PUT(request: NextRequest) {
  try {
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

// Delete a location (service role; validate business_id only)
export async function DELETE(request: NextRequest) {
  try {
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
