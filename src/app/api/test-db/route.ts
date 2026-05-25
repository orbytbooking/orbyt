import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json(
        { 
          error: 'Database connection failed', 
          details: error.message,
          hint: 'Make sure you have run the setup.sql script in Supabase SQL Editor'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      tables: ['profiles', 'businesses', 'bookings'],
      nextSteps: [
        '1. Run the database/setup.sql script in Supabase SQL Editor',
        '2. Test the signup flow at /auth/signup',
        '3. Complete onboarding at /auth/onboarding'
      ]
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
