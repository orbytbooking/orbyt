import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Create Supabase client with service role to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aezwtsnvttquqkzjhoak.supabase.co';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlend0c252dHRxdXFrempob2FrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYxNzcwMiwiZXhwIjoyMDgzMTkzNzAyfQ.MW8hx4BcMKDG3-fxNcIrmcbdu2xIfYjIxIunqPmN3D0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch all industries for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const { data: industries, error } = await supabase
      .from('industries')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching industries:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return NextResponse.json({ error: 'Industries table not found. Please run the database migration first.' }, { status: 500 });
      }
      return NextResponse.json({ error: `Failed to fetch industries: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ industries });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a new industry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, business_id, is_custom = false } = body;

    if (!name || !business_id) {
      return NextResponse.json({ error: 'Name and business_id are required' }, { status: 400 });
    }

    const { data: industry, error } = await supabase
      .from('industries')
      .insert([
        {
          name: name.trim(),
          description: description?.trim() || null,
          business_id,
          is_custom
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding industry:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Industry already exists for this business' }, { status: 409 });
      }
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return NextResponse.json({ error: 'Industries table not found. Please run the database migration first.' }, { status: 500 });
      }
      return NextResponse.json({ error: `Failed to add industry: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ industry }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove an industry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const industryId = searchParams.get('id');

    if (!industryId) {
      return NextResponse.json({ error: 'Industry ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('industries')
      .delete()
      .eq('id', industryId);

    if (error) {
      console.error('Error deleting industry:', error);
      return NextResponse.json({ error: 'Failed to delete industry' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
