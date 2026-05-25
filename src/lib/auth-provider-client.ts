import { getSupabaseProviderClient } from '@/lib/supabaseProviderClient';

export async function getAuthToken() {
  const { data: { session } } = await getSupabaseProviderClient().auth.getSession();
  return session?.access_token;
}

export async function createAuthenticatedFetch(url: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}
