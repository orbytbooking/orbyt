import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/** List YYYY-MM-DD dates in [startStr, endStr] (inclusive) that have the given UTC day of week (0–6). */
function getDatesWithDayInRange(
  startStr: string,
  endStr: string | null,
  dayOfWeek: number
): string[] {
  const out: string[] = [];
  const start = new Date(startStr + 'T12:00:00Z');
  const end = endStr
    ? new Date(endStr + 'T12:00:00Z')
    : new Date(start);
  if (!endStr) end.setUTCFullYear(end.getUTCFullYear() + 1);
  const cur = new Date(start.getTime());
  while (cur <= end) {
    if (cur.getUTCDay() === dayOfWeek) {
      const y = cur.getUTCFullYear();
      const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
      const d = String(cur.getUTCDate()).padStart(2, '0');
      out.push(`${y}-${m}-${d}`);
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== PROVIDER AVAILABILITY API ===');
    
    // Create service role client for server-side operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user session with token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get provider data
    console.log('🔍 Looking up provider for user_id:', user.id);
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('service_providers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('📊 Provider query result:', { provider, error: providerError });

    if (providerError || !provider) {
      console.error('❌ Provider not found error:', providerError);
      return NextResponse.json(
        { error: 'Provider not found', details: providerError?.message },
        { status: 404 }
      );
    }

    // Get provider availability from database
    const { data: availability, error: availabilityError } = await supabaseAdmin
      .from('provider_availability')
      .select('*')
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (availabilityError) {
      console.error('Error fetching availability:', availabilityError);
      return NextResponse.json(
        { error: 'Failed to fetch availability' },
        { status: 500 }
      );
    }

    // Auto-repair: if a slot was created for a single date but expiry_date is missing,
    // it becomes "recurring" for every future week. Default provider UI expects single-date slots.
    const needsRepair = (availability || []).filter((row: any) => row.effective_date && !row.expiry_date);
    if (needsRepair.length > 0) {
      console.warn(`⚠️ Repairing ${needsRepair.length} availability row(s) missing expiry_date`);
      for (const row of needsRepair) {
        try {
          await supabaseAdmin
            .from('provider_availability')
            .update({ expiry_date: row.effective_date, updated_at: new Date().toISOString() })
            .eq('id', row.id)
            .eq('provider_id', provider.id)
            .eq('business_id', provider.business_id);
        } catch (e) {
          console.error('Repair update failed for availability row', row?.id, e);
        }
      }

      const { data: repaired, error: repairedError } = await supabaseAdmin
        .from('provider_availability')
        .select('*')
        .eq('provider_id', provider.id)
        .eq('business_id', provider.business_id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (!repairedError) {
        return NextResponse.json(repaired || []);
      }
    }

    return NextResponse.json(availability || []);

  } catch (error) {
    console.error('Availability API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE AVAILABILITY SLOT API ===');
    
    // Create service role client for server-side operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user session with token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get provider data
    console.log('🔍 Looking up provider for user_id:', user.id);
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('service_providers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('📊 Provider query result:', { provider, error: providerError });

    if (providerError || !provider) {
      console.error('❌ Provider not found error:', providerError);
      return NextResponse.json(
        { error: 'Provider not found', details: providerError?.message },
        { status: 404 }
      );
    }

    const { date, startTime, endTime } = await request.json();

    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Date, start time, and end time are required' },
        { status: 400 }
      );
    }

    // Convert date to day of week (0 = Sunday, 1 = Monday, etc.)
    // Parse date string (YYYY-MM-DD) directly as UTC to ensure consistent calculation
    // This matches the calculation in the admin available-slots API
    const [year, month, day] = date.split('-').map(Number);
    const bookingDate = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = bookingDate.getUTCDay();
    
    console.log('🔍 API Date calculation:');
    console.log(`  - Input date: ${date}`);
    console.log(`  - Parsed as UTC: ${year}-${month}-${day}`);
    console.log(`  - UTC Date: ${bookingDate.toUTCString()}`);
    console.log(`  - getUTCDay(): ${dayOfWeek} (0=Sunday, 6=Saturday)`);

    // Create availability slot in database
    const { data: newSlot, error: insertError } = await supabaseAdmin
      .from('provider_availability')
      .insert({
        provider_id: provider.id,
        business_id: provider.business_id,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_available: true,
        effective_date: date,
        // IMPORTANT: Provider UI creates single-date slots, so constrain to this date
        expiry_date: date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating availability slot:', insertError);
      console.error('Error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      return NextResponse.json(
        { 
          error: 'Failed to create availability slot',
          details: insertError.message,
          code: insertError.code
        },
        { status: 500 }
      );
    }

    // Sync availability update to admin dashboard
    // Update provider's last_active_at to trigger admin refresh
    await supabaseAdmin
      .from('service_providers')
      .update({
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString()
      })
      .eq('id', provider.id)
      .eq('business_id', provider.business_id);

    return NextResponse.json(newSlot);

  } catch (error) {
    console.error('Create availability API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('=== UPDATE AVAILABILITY SLOT API ===');

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const { data: provider, error: providerError } = await supabaseAdmin
      .from('service_providers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (providerError || !provider) {
      return NextResponse.json({ error: 'Provider not found', details: providerError?.message }, { status: 404 });
    }

    const { slotId, date, startTime, endTime } = await request.json();
    if (!slotId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'slotId, date, startTime, and endTime are required' },
        { status: 400 }
      );
    }

    // Recalculate day_of_week in UTC to match booking logic
    const [year, month, day] = date.split('-').map(Number);
    const bookingDate = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = bookingDate.getUTCDay();

    const { data: updatedSlot, error: updateError } = await supabaseAdmin
      .from('provider_availability')
      .update({
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        effective_date: date,
        expiry_date: date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', slotId)
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating availability slot:', updateError);
      return NextResponse.json(
        { error: 'Failed to update availability slot', details: updateError.message, code: updateError.code },
        { status: 500 }
      );
    }

    // Trigger admin refresh
    await supabaseAdmin
      .from('service_providers')
      .update({
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString()
      })
      .eq('id', provider.id)
      .eq('business_id', provider.business_id);

    return NextResponse.json(updatedSlot);
  } catch (error) {
    console.error('Update availability API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('=== DELETE AVAILABILITY SLOT API ===');
    
    // Create service role client for server-side operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user session with token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get provider data
    console.log('🔍 Looking up provider for user_id:', user.id);
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('service_providers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('📊 Provider query result:', { provider, error: providerError });

    if (providerError || !provider) {
      console.error('❌ Provider not found error:', providerError);
      return NextResponse.json(
        { error: 'Provider not found', details: providerError?.message },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get('slotId');
    const removeAll = searchParams.get('all') === 'true';
    const dateOnly = searchParams.get('date') || null; // YYYY-MM-DD: remove slot only for this date

    if (!slotId && !removeAll) {
      return NextResponse.json(
        { error: 'Slot ID is required, or use ?all=true to remove all availability' },
        { status: 400 }
      );
    }

    if (removeAll) {
      // Delete all availability slots for this provider
      const { error: deleteError } = await supabaseAdmin
        .from('provider_availability')
        .delete()
        .eq('provider_id', provider.id)
        .eq('business_id', provider.business_id);

      if (deleteError) {
        console.error('Error deleting all availability:', deleteError);
        return NextResponse.json(
          { error: 'Failed to remove all availability' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, removed: 'all' });
    }

    // Fetch the slot to check if it spans multiple dates (recurring or range)
    const { data: slot, error: fetchError } = await supabaseAdmin
      .from('provider_availability')
      .select('id, effective_date, expiry_date, day_of_week, start_time, end_time')
      .eq('id', slotId)
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id)
      .single();

    if (fetchError || !slot) {
      return NextResponse.json(
        { error: 'Slot not found', details: fetchError?.message },
        { status: 404 }
      );
    }

    const effectiveDate = slot.effective_date as string | null;
    const expiryDate = slot.expiry_date as string | null;
    const dayOfWeek = slot.day_of_week as number;
    const startTime = slot.start_time as string;
    const endTime = slot.end_time as string;

    // Check if slot spans multiple dates (recurring or range) and we're removing only one date
    const isSingleDate = effectiveDate && expiryDate && effectiveDate === expiryDate;
    const removeOnlyThisDate = dateOnly && !isSingleDate;

    if (removeOnlyThisDate) {
      // Slot applies to many dates (e.g. every Sunday). Remove only the requested date:
      // list all dates it applies to, drop dateOnly, delete original row, insert one row per remaining date
      const endForRange = expiryDate || null;
      const dates = getDatesWithDayInRange(
        effectiveDate || new Date().toISOString().slice(0, 10),
        endForRange,
        dayOfWeek
      );
      const remaining = dates.filter((d) => d !== dateOnly);
      if (remaining.length === 0) {
        // Only that date was in range; delete the row
        const { error: delErr } = await supabaseAdmin
          .from('provider_availability')
          .delete()
          .eq('id', slotId)
          .eq('provider_id', provider.id)
          .eq('business_id', provider.business_id);
        if (delErr) {
          console.error('Error deleting slot:', delErr);
          return NextResponse.json({ error: 'Failed to delete slot' }, { status: 500 });
        }
      } else {
        // Delete original and insert one row per remaining date (single-date slots)
        const { error: delErr } = await supabaseAdmin
          .from('provider_availability')
          .delete()
          .eq('id', slotId)
          .eq('provider_id', provider.id)
          .eq('business_id', provider.business_id);
        if (delErr) {
          console.error('Error deleting slot:', delErr);
          return NextResponse.json({ error: 'Failed to delete slot' }, { status: 500 });
        }
        const now = new Date().toISOString();
        for (const d of remaining) {
          const { error: insErr } = await supabaseAdmin.from('provider_availability').insert({
            provider_id: provider.id,
            business_id: provider.business_id,
            day_of_week: dayOfWeek,
            start_time: startTime,
            end_time: endTime,
            is_available: true,
            effective_date: d,
            expiry_date: d,
            created_at: now,
            updated_at: now,
          });
          if (insErr) {
            console.error('Error re-inserting slot for date', d, insErr);
          }
        }
      }
    } else {
      // Single-date slot or no date param: delete the whole row
      const { error: deleteError } = await supabaseAdmin
        .from('provider_availability')
        .delete()
        .eq('id', slotId)
        .eq('provider_id', provider.id)
        .eq('business_id', provider.business_id);

      if (deleteError) {
        console.error('Error deleting availability slot:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete availability slot' },
          { status: 500 }
        );
      }
    }

    // Sync availability update to admin dashboard
    // Update provider's last_active_at to trigger admin refresh
    await supabaseAdmin
      .from('service_providers')
      .update({
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString()
      })
      .eq('id', provider.id)
      .eq('business_id', provider.business_id);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete availability API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
