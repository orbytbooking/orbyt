import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';

export async function getAuthenticatedUser() {
  try {
    // Create server client that can read cookies
    const cookieStore = await cookies();
    const supabase = createSupabaseServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    );
    
    // Get session from cookies
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return null;
    }
    
    if (!session || !session.user) {
      console.error('No session found');
      return null;
    }
    
    return session.user;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

export function createUnauthorizedResponse(message: string = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function createForbiddenResponse(message: string = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}
