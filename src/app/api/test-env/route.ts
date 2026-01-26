import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('=== ENV TEST ENDPOINT ===');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
  
  const serviceKeyLength = process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0;
  const serviceKeyFormat = process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ') ? 'JWT format' : 'Unknown';

  return NextResponse.json({
    environment: 'Node.js (Server)',
    variables: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
    },
    serviceKeyDetails: {
      length: serviceKeyLength,
      format: serviceKeyFormat,
      isSet: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    timestamp: new Date().toISOString()
  });
}
