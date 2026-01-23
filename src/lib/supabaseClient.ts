import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey: string | undefined = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error('Supabase URL or Anon Key is missing in environment variables.');
}

// Default client for client-side and most SSR usage
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Optional: Service role client (for backend/server-only usage)
export const supabaseAdmin: SupabaseClient | null = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

// Debug: Check if service role key is being loaded
if (typeof window !== 'undefined') {
  console.log('=== ENVIRONMENT DEBUG ===');
  console.log('1. SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
  console.log('2. Service role key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
  console.log('3. Service role key starts with eyJ:', process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ'));
}

// Debug: Check if admin client is available
if (typeof window !== 'undefined') {
  console.log('Service role key available:', !!supabaseServiceRoleKey);
  console.log('Admin client available:', !!supabaseAdmin);
}