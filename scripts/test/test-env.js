// Test script to verify environment variables
console.log('=== TESTING ENVIRONMENT VARIABLES ===');

// Check if we're in Node.js environment
console.log('Environment:', typeof window === 'undefined' ? 'Node.js (Server)' : 'Browser (Client)');

// Check environment variables
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');

// Check service role key details
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('Service role key length:', process.env.SUPABASE_SERVICE_ROLE_KEY.length);
  console.log('Service role key format:', process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ') ? 'JWT format' : 'Unknown format');
} else {
  console.error('❌ SERVICE ROLE KEY IS MISSING - This is why provider creation fails!');
}

console.log('\n=== SOLUTION ===');
console.log('1. Make sure your .env file contains SUPABASE_SERVICE_ROLE_KEY');
console.log('2. Get the key from your Supabase project > Settings > API');
console.log('3. Add it to .env: SUPABASE_SERVICE_ROLE_KEY=your_actual_key_here');
console.log('4. Restart your development server');
